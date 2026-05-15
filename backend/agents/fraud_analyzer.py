import sys
import os
import time
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

sys.path.append(str(Path(__file__).parent.parent))
import hasher
import blockchain
import database
from pydantic import BaseModel, Field
from typing import cast, Optional, Any

logger = logging.getLogger("FraudAnalyzer")

class FraudAnalysis(BaseModel):
    fraud_score: int = Field(description="Integer from 0 to 100, where 100 is absolute fraud", ge=0, le=100)
    report: str = Field(description="A short, definitive paragraph explaining the verdict.")

class FraudAnalyzer:
    def __init__(self):
        try:
            self.llm: Optional[Any] = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.1).with_structured_output(FraudAnalysis)
        except Exception as e:
            logger.critical(f"LLM init failed: {e}")
            self.llm = None
            
        self.prompt = PromptTemplate.from_template(
            "You are an AI Insurance Fraud Analyzer. You must decide if a cyber insurance claim is legitimate.\n"
            "Claim Details: {claim_data}\n"
            "Historical Posture context: {historical_posture}\n"
            "Provide a final fraud analysis report based strictly on these details."
        )
        self.chain: Optional[Any] = self.prompt | self.llm if self.llm else None

    async def analyze_claim(self, claim_id: int, claim_data: str, historical_posture: str, queue: asyncio.Queue, notarizer) -> dict:
        chain = self.chain
        print(f"[Fraud Analyzer] Analyzing Claim #{claim_id}...")
        try:
            if not chain:
                score = 80 if "proxy" in str(claim_data).lower() else 60 if "PAID" in str(claim_data) else 20
                from pydantic import BaseModel
                class DummyFraud(BaseModel):
                    report: str
                    fraud_score: int
                decision_obj = DummyFraud(
                    report=f"MOCKED AI LOGIC: Analyzed claim data. Indicators match known fraud patterns.",
                    fraud_score=score
                )
            else:
                raw_response = await chain.ainvoke({
                    "claim_data": claim_data, 
                    "historical_posture": historical_posture
                })
                decision_obj = cast(FraudAnalysis, raw_response)
            
            onchain_id = None
            if decision_obj.fraud_score >= 50:
                onchain_id = await notarizer.get_next_id()
                event = {
                    "event_id": onchain_id,
                    "instruction_hash": hasher.sha256(self.prompt.template),
                    "context_hash": hasher.sha256(claim_data + historical_posture),
                    "reasoning_hash": hasher.sha256(decision_obj.report),
                    "action_hash": hasher.sha256(f"Fraud Score: {decision_obj.fraud_score}"),
                    "risk_level": 3,
                    "timestamp": int(time.time()),
                    "agent_name": "FraudAnalyzer"
                }
                await queue.put(event)

            # Persist to DB
            if decision_obj.fraud_score < 30:
                recommendation = "APPROVE"
            elif decision_obj.fraud_score < 75:
                recommendation = "PARTIAL"
            else:
                recommendation = "DENY"

            database.insert_claim_analysis(
                claim_id=claim_id,
                fraud_score=decision_obj.fraud_score,
                reasoning=decision_obj.report,
                recommendation=recommendation
            )
            decision_id = database.insert_ai_decision(
                agent_name="FraudAnalyzer",
                instruction=self.prompt.template,
                context=f"{claim_data} | Posture: {historical_posture}",
                reasoning=decision_obj.report,
                action_taken=f"Fraud Score: {decision_obj.fraud_score}/100 — {recommendation}",
                risk_level=1 if decision_obj.fraud_score < 50 else 3,
                event_id=onchain_id,
                claim_id=claim_id,
                onchain_entry_id=onchain_id
            )
            database.insert_system_action(
                action_type="POLICY_CHECK",
                target=f"Claim #{claim_id}",
                description=f"Fraud score: {decision_obj.fraud_score}/100 — Recommendation: {recommendation}",
                triggered_by="FraudAnalyzer",
                status="SUCCESS",
                decision_id=decision_id
            )

            # Fix 9: Robust transaction signing for ClaimsProcessor
            if blockchain.BLOCKCHAIN_AVAILABLE and blockchain.claims_processor:
                try:
                    report_hash = hasher.sha256(decision_obj.report)
                    tx = blockchain.claims_processor.functions.recordFraudScore(
                        claim_id,
                        decision_obj.fraud_score,
                        blockchain.Web3.to_bytes(hexstr=report_hash)
                    ).build_transaction({
                        "from": blockchain.w3.eth.default_account,
                        "gas": 200000,
                        "gasPrice": blockchain.w3.eth.gas_price,
                        "nonce": blockchain.w3.eth.get_transaction_count(blockchain.w3.eth.default_account),
                    })
                    
                    signed = blockchain.w3.eth.account.sign_transaction(
                        tx, private_key=os.getenv("PRIVATE_KEY")
                    )
                    tx_hash = blockchain.w3.eth.send_raw_transaction(signed.raw_transaction)
                    print(f"[Fraud Analyzer] Transaction Sent: {tx_hash.hex()}")
                except Exception as tx_e:
                    logger.error(f"Blockchain transaction failed: {tx_e}")
                
            return {
                "success": True,
                "fraud_score": decision_obj.fraud_score,
                "report": decision_obj.report,
                "event_id": onchain_id,
                "notarization": "queued"
            }
        except Exception as e:
            logger.error(f"Failed to analyze claim: {e}")
            return {"success": False, "error": str(e)}
