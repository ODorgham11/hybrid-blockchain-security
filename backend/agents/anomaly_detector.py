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

logger = logging.getLogger("AnomalyDetector")

class AnomalyReport(BaseModel):
    anomaly_detected: bool = Field(description="Boolean indicating if an anomaly was found")
    reasoning: str = Field(description="Explanation of findings")
    recommended_action: str = Field(description="The exact action to take (e.g., 'audit admin accounts', 'none')")

class AnomalyDetector:
    def __init__(self):
        try:
            self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.1).with_structured_output(AnomalyReport)
        except Exception as e:
            logger.critical(f"LLM init failed: {e}")
            self.llm = None
            
        self.prompt = PromptTemplate.from_template(
            "You are an AI Anomaly Detector. Review these daily security logs:\n"
            "{daily_logs}\n"
            "Look for patterns that indicate a stealthy intrusion or compromised hygiene and provide your report."
        )
        self.chain = self.prompt | self.llm if self.llm else None

    async def analyze_daily_logs(self, logs_json: str, queue: asyncio.Queue, notarizer) -> dict:
        if not self.llm:
            return {"success": False, "error": "LLM unavailable — check GOOGLE_API_KEY"}
            
        print("[Anomaly Detector] Analyzing daily logs...")
        try:
            decision_obj = await self.chain.ainvoke({"daily_logs": logs_json})
            
            if decision_obj.anomaly_detected:
                event_id = await notarizer.get_next_id()
                event = {
                    "event_id": event_id,
                    "instruction_hash": hasher.sha256(self.prompt.template),
                    "context_hash": hasher.sha256(logs_json),
                    "reasoning_hash": hasher.sha256(decision_obj.reasoning),
                    "action_hash": hasher.sha256(decision_obj.recommended_action),
                    "risk_level": 2,
                    "timestamp": int(time.time()),
                    "agent_name": "AnomalyDetector"
                }
                await queue.put(event)
                print(f"[Anomaly Detector] Event #{event_id} queued.")
                
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
