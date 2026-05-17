import sys
import time
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

sys.path.append(str(Path(__file__).parent.parent))
import hasher
import database
import blockchain
from pydantic import BaseModel, Field
from typing import cast, Optional, Any

logger = logging.getLogger("AnomalyDetector")

class AnomalyReport(BaseModel):
    anomaly_detected: bool = Field(description="Boolean indicating if an anomaly was found")
    reasoning: str = Field(description="Explanation of findings")
    recommended_action: str = Field(description="The exact action to take (e.g., 'audit admin accounts', 'none')")

class AnomalyDetector:
    def __init__(self):
        try:
            self.llm: Optional[Any] = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.1).with_structured_output(AnomalyReport)
        except Exception as e:
            logger.critical(f"LLM init failed: {e}")
            self.llm = None
            
        self.prompt = PromptTemplate.from_template(
            "You are an AI Anomaly Detector. Review these daily security logs:\n"
            "{daily_logs}\n"
            "Look for patterns that indicate a stealthy intrusion or compromised hygiene and provide your report."
        )
        self.chain: Optional[Any] = self.prompt | self.llm if self.llm else None

    async def analyze_daily_logs(self, logs_json: str, queue: asyncio.Queue, notarizer) -> dict:
        chain = self.chain
        blockchain_id = None
        print(f"[Anomaly Detector] Analyzing daily logs...")
        try:
            if not chain:
                from pydantic import BaseModel
                class DummyAnomaly(BaseModel):
                    anomaly_detected: bool
                    reasoning: str
                    recommended_action: str
                detected = "CRITICAL" in logs_json or "HIGH" in logs_json
                decision_obj = DummyAnomaly(
                    anomaly_detected=detected,
                    reasoning=f"MOCKED AI LOGIC: Analyzed daily logs. {'Anomalous patterns detected.' if detected else 'No anomalies detected.'}",
                    recommended_action="ESCALATE" if detected else "NONE"
                )
            else:
                raw_response = await chain.ainvoke({"daily_logs": logs_json})
                decision_obj = cast(AnomalyReport, raw_response)
            
            if decision_obj.anomaly_detected:
                # Instantly write high-risk anomaly to Blockchain (AuditRegistry)
                ih = hasher.sha256(self.prompt.template)
                ch = hasher.sha256(logs_json[:200])
                rh = hasher.sha256(decision_obj.reasoning)
                ah = hasher.sha256(decision_obj.recommended_action)
                
                blockchain_id = blockchain.log_ai_action(ih, ch, rh, ah, 2)
                if blockchain_id == -1:
                    blockchain_id = await notarizer.get_next_id()
                
                event = {
                    "event_id": blockchain_id,
                    "instruction_hash": hasher.sha256(self.prompt.template),
                    "context_hash": hasher.sha256(logs_json),
                    "reasoning_hash": hasher.sha256(decision_obj.reasoning),
                    "action_hash": hasher.sha256(decision_obj.recommended_action),
                    "risk_level": 2,
                    "timestamp": int(time.time()),
                    "agent_name": "AnomalyDetector"
                }
                await queue.put(event)
                print(f"[Anomaly Detector] Event #{blockchain_id} queued.")

            # Persist to DB (always)
            action_lower = decision_obj.recommended_action.lower()
            action_type = "PATCH_FLAG" if "patch" in action_lower else \
                          "QUARANTINE" if "quarantin" in action_lower else \
                          "ALERT_ESCALATION"
                          
            decision_id = database.insert_ai_decision(
                agent_name="AnomalyDetector",
                instruction=self.prompt.template,
                context=logs_json[:200],
                reasoning=decision_obj.reasoning,
                action_taken=decision_obj.recommended_action,
                risk_level=2 if decision_obj.anomaly_detected else 0,
                event_id=blockchain_id,
                onchain_entry_id=blockchain_id
            )
            database.insert_system_action(
                action_type=action_type,
                target="Daily Log Analysis",
                description=decision_obj.recommended_action,
                triggered_by="AnomalyDetector",
                status="SUCCESS",
                decision_id=decision_id
            )
                
            return {
                "success": True,
                "anomaly_detected": decision_obj.anomaly_detected,
                "reasoning": decision_obj.reasoning,
                "recommended_action": decision_obj.recommended_action,
                "notarization": "queued" if decision_obj.anomaly_detected else "none"
            }
        except Exception as e:
            logger.error(f"Failed to process logs: {e}")
            return {"success": False, "error": str(e)}
