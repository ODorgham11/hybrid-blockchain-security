import sys
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our custom modules
import blockchain
from agents.security_agent import SecurityAgent
from agents.anomaly_detector import AnomalyDetector
from agents.fraud_analyzer import FraudAnalyzer
from notarizer import Notarizer

app = FastAPI(title="Hybrid Security & Insurance Backend (Phase 2 Fixed)")

# Constraint: uvicorn must run with --workers 1
# This ensures asyncio.Lock works correctly for the sequential ID system.

# Initialize async queue for agent events
event_queue = asyncio.Queue()
notarizer = Notarizer(event_queue)

# CORS Fix: Restricted to frontend URL for credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI Agents
security_agent = SecurityAgent()
anomaly_detector = AnomalyDetector()
fraud_analyzer = FraudAnalyzer()

@app.on_event("startup")
async def startup_event():
    """System startup: Initialize blockchain and start background notarizer."""
    blockchain.init_blockchain()
    notarizer.start()

# --- Request Models ---
class AlertRequest(BaseModel):
    alert: str
    context: str

class LogsRequest(BaseModel):
    daily_logs: str

class ClaimRequest(BaseModel):
    claim_id: int
    claim_data: str
    historical_posture: str

# --- API Endpoints ---

@app.post("/api/analyze-alert")
async def analyze_security_alert(req: AlertRequest):
    result = await security_agent.handle_alert(req.alert, req.context, event_queue, notarizer)
    if not result.get("success", True) or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    return result

@app.post("/api/analyze-daily-logs")
async def analyze_logs(req: LogsRequest):
    result = await anomaly_detector.analyze_daily_logs(req.daily_logs, event_queue, notarizer)
    if not result.get("success", True) or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    return result

@app.post("/api/analyze-claim")
async def analyze_insurance_claim(req: ClaimRequest):
    result = await fraud_analyzer.analyze_claim(req.claim_id, req.claim_data, req.historical_posture, event_queue, notarizer)
    if not result.get("success", True) or "error" in result:
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    return result

@app.get("/api/sequence-status")
async def get_sequence_status():
    return notarizer.get_sequence_status()

@app.get("/api/verify-event/{event_hash}")
async def verify_event(event_hash: str):
    proof_data = notarizer.get_event_proof(event_hash)
    if not proof_data:
        raise HTTPException(status_code=404, detail="Event hash not found.")
    return proof_data

@app.get("/")
def health_check():
    return {
        "status": "active",
        "blockchain": "connected" if blockchain.BLOCKCHAIN_AVAILABLE else "disconnected",
        "llm": "ready" # Agents check individually
    }

if __name__ == "__main__":
    import uvicorn
    # Single worker only for sequence integrity
    uvicorn.run("main:app", host="127.0.0.1", port=8000, workers=1)
