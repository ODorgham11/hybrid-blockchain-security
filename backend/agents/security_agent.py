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

logger = logging.getLogger("SecurityAgent")

class SecurityDecision(BaseModel):
    reasoning: str = Field(description="Brief explanation of why this is or isn't a threat.")
    action: str = Field(description="The exact action to take (e.g., 'block ip', 'isolate host', 'ignore')")
    risk_level: int = Field(description="Risk level from 0 to 3: 0 (Safe), 1 (Low), 2 (High), 3 (Critical).", ge=0, le=3)

class SecurityAgent:
    def __init__(self):
        # Fix 5: Graceful LLM initialization
        try:
            self.llm = ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.2).with_structured_output(SecurityDecision)
        except Exception as e:
            logger.critical(f"LLM init failed: {e}")
            self.llm = None
        
        self.prompt = PromptTemplate.from_template(
            "You are an autonomous AI SOC Agent defending a corporate network.\n"
            "Threat Alert: {alert}\n"
            "System Context: {context}\n"
            "Analyze the threat and provide your decision."
        )
        self.chain = self.prompt | self.llm if self.llm else None

    async def handle_alert(self, alert_text: str, system_context: str, queue: asyncio.Queue, notarizer) -> dict:
        if not self.llm:
            return {"success": False, "error": "LLM unavailable — check GOOGLE_API_KEY"}
            
        print(f"[Security Agent] Analyzing alert: {alert_text}")
        try:
            decision_obj = await self.chain.ainvoke({"alert": alert_text, "context": system_context})
            event_id = await notarizer.get_next_id()
            
            event = {
                "event_id": event_id,
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
                event_id=event_id,
                onchain_entry_id=event_id
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
                "event_id": event_id,
                "action": decision_obj.action,
                "reasoning": decision_obj.reasoning,
                "risk_level": decision_obj.risk_level,
                "notarization": "queued"
            }
        except Exception as e:
            logger.error(f"Failed to process decision: {e}")
            return {"success": False, "error": str(e)}
