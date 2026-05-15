import sys
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure backend dir is always on path regardless of CWD
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Explicitly load .env from parent directory
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Import our custom modules
import blockchain
import database
from agents.security_agent import SecurityAgent
from agents.anomaly_detector import AnomalyDetector
from agents.fraud_analyzer import FraudAnalyzer
from notarizer import Notarizer

# Constraint: uvicorn must run with --workers 1
# This ensures asyncio.Lock works correctly for the sequential ID system.

# Initialize async queue for agent events
event_queue = asyncio.Queue()
notarizer = Notarizer(event_queue)

# Initialize AI Agents
security_agent = SecurityAgent()
anomalydetector = AnomalyDetector()
fraud_analyzer = FraudAnalyzer()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """System startup: Initialize blockchain, DB, and start background notarizer."""
    database.init_db()
    blockchain.init_blockchain()
    notarizer.start()
    yield
    # Shutdown: cancel the notarizer background task
    if notarizer._task:
        notarizer._task.cancel()

app = FastAPI(title="Aegis OS — Hybrid Security & Insurance Backend", lifespan=lifespan)

# CORS Fix: Restricted to frontend URL for credentials support
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174",
        "http://localhost:5175"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    result = await anomalydetector.analyze_daily_logs(req.daily_logs, event_queue, notarizer)
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

@app.get("/api/db-dump")
async def get_db_dump():
    decisions = database.get_ai_decisions(limit=500)
    import hasher
    for d in decisions:
        d["instruction_hash"] = hasher.sha256(d["instruction"])
        d["context_hash"] = hasher.sha256(d.get("context") or "")
        d["reasoning_hash"] = hasher.sha256(d["reasoning"])
        d["action_hash"] = hasher.sha256(d["action_taken"])
    return {"ai_decisions": decisions}

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

# ── New Database Read Endpoints ─────────────────────────────────────────

@app.get("/api/activity-feed")
def get_activity_feed(limit: int = 100):
    """All system actions merged with AI context, newest first."""
    return database.get_activity_feed(limit=limit)

@app.get("/api/ai-decisions")
def get_ai_decisions(limit: int = 50):
    """Recent AI decisions with full reasoning text."""
    return database.get_ai_decisions(limit=limit)

@app.get("/api/claim-analysis/{claim_id}")
def get_claim_analysis(claim_id: int):
    """Fraud analysis for a specific claim."""
    result = database.get_claim_analysis(claim_id)
    if not result:
        raise HTTPException(status_code=404, detail="No analysis found for this claim")
    return result

@app.get("/api/alerts")
def get_recent_alerts(limit: int = 20):
    """Recent raw security alerts."""
    return database.get_recent_alerts(limit=limit)

@app.get("/api/system-stats")
def get_system_stats():
    """Aggregate stats for the Admin Dashboard."""
    return database.get_system_stats()
