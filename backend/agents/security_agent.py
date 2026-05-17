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

logger = logging.getLogger("SecurityAgent")

class SecurityDecision(BaseModel):
    reasoning: str = Field(description="Brief explanation of why this is or isn't a threat.")
    action: str = Field(description="The exact action to take (e.g., 'block ip', 'isolate host', 'ignore')")
    risk_level: int = Field(description="Risk level from 0 to 3: 0 (Safe), 1 (Low), 2 (High), 3 (Critical).", ge=0, le=3)

class SecurityAgent:
    def __init__(self):
        # Fix 5: Graceful LLM initialization
        try:
            self.llm: Optional[Any] = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.2).with_structured_output(SecurityDecision)
        except Exception as e:
            logger.critical(f"LLM init failed: {e}")
            self.llm = None
        
        self.prompt = PromptTemplate.from_template(
            "You are an autonomous AI SOC Agent defending a corporate network.\n"
            "Threat Alert: {alert}\n"
            "Review this context: {context}\n"
            "Respond strictly in the structured format."
        )
        self.chain: Optional[Any] = self.prompt | self.llm if self.llm else None

    async def handle_alert(self, alert_text: str, system_context: str, queue: asyncio.Queue, notarizer) -> dict:
        chain = self.chain
        blockchain_id = None
        print(f"[Security Agent] Analyzing alert: {alert_text}")
        try:
            if not chain:
                # Mock response for presentation when LLM is unavailable
                risk = 3 if "CRITICAL" in alert_text else 2 if "HIGH" in alert_text else 1
                decision_obj = SecurityDecision(
                    reasoning=f"MOCKED AI LOGIC: Analyzed payload and detected {'critical' if risk==3 else 'high' if risk==2 else 'low'} threat patterns based on known signatures.",
                    action="ISOLATE HOST" if risk == 3 else "BLOCK IP" if risk == 2 else "LOG ONLY",
                    risk_level=risk
                )
            else:
                raw_response = await chain.ainvoke({"alert": alert_text, "context": system_context})
                decision_obj = cast(SecurityDecision, raw_response)
            
            if decision_obj.risk_level >= 2:
                # Instantly write to the Blockchain (AuditRegistry)
                ih = hasher.sha256(self.prompt.template)
                ch = hasher.sha256(system_context)
                rh = hasher.sha256(decision_obj.reasoning)
                ah = hasher.sha256(decision_obj.action)
                
                blockchain_id = blockchain.log_ai_action(ih, ch, rh, ah, decision_obj.risk_level)
                if blockchain_id == -1: # fallback to notarizer if chain fails
                    blockchain_id = await notarizer.get_next_id()
                
                event = {
                    "event_id": blockchain_id,
                    "instruction_hash": hasher.sha256(self.prompt.template),
                    "context_hash": hasher.sha256(system_context),
                    "reasoning_hash": hasher.sha256(decision_obj.reasoning),
                    "action_hash": hasher.sha256(decision_obj.action),
                    "risk_level": decision_obj.risk_level,
                    "timestamp": int(time.time()),
                    "agent_name": "SecurityAgent"
                }
                await queue.put(event)

            # Persist full reasoning to DB
            action_lower = decision_obj.action.lower()
            if "block" in action_lower and "firewall" in action_lower:
                action_type = "FIREWALL_BLOCK"
            elif "block" in action_lower or "blacklist" in action_lower:
                action_type = "IP_BLOCK"
            elif "isolat" in action_lower or "quarantin" in action_lower:
                action_type = "QUARANTINE"
            elif "patch" in action_lower:
                action_type = "PATCH_FLAG"
            else:
                action_type = "ALERT_ESCALATION"

            decision_id = database.insert_ai_decision(
                agent_name="SecurityAgent",
                instruction=self.prompt.template,
                context=system_context,
                reasoning=decision_obj.reasoning,
                action_taken=decision_obj.action,
                risk_level=decision_obj.risk_level,
                # Fix for previous NameError: We use 'blockchain_id' here because 'event_id' is not defined in this local scope.
                # 'blockchain_id' accurately represents both the local queue ID and the official blockchain Smart Contract entry ID.
                event_id=blockchain_id,
                onchain_entry_id=blockchain_id
            )
            database.insert_system_action(
                action_type=action_type,
                target=system_context[:80],
                description=decision_obj.action,
                triggered_by="SecurityAgent",
                status="SUCCESS",
                decision_id=decision_id
            )

            return {
                "success": True,
                "event_id": blockchain_id,
                "action": decision_obj.action,
                "reasoning": decision_obj.reasoning,
                "risk_level": decision_obj.risk_level,
                "notarization": "queued"
            }
        except Exception as e:
            logger.error(f"Failed to process decision: {e}")
            return {"success": False, "error": str(e)}
