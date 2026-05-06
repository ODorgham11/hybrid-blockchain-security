# Project Code Review Snapshot
Generated on: 2026-05-06

## 1. Directory Structure
```text
Hybrid_Blockchain_Project
├── .env
├── .gitignore
├── .python-version
├── .venv
├── .vscode
├── artifacts
├── backend
│   ├── agents
│   │   ├── anomaly_detector.py
│   │   ├── fraud_analyzer.py
│   │   └── security_agent.py
│   ├── blockchain.py
│   ├── deployed_addresses.json
│   ├── hasher.py
│   ├── main.py
│   ├── notarizer.py
│   ├── requirements.txt
│   ├── test_all.py
│   └── test_key.py
├── cache
├── codebase_snapshot.txt
├── contracts
│   ├── AuditRegistry.sol
│   ├── ClaimsProcessor.sol
│   ├── Governance.sol
│   ├── PolicyEngine.sol
│   └── PostureRegistry.sol
├── docs
├── frontend
│   ├── src
│   │   ├── App.jsx
│   │   ├── api
│   │   │   ├── backend.js
│   │   │   └── blockchain.js
│   │   ├── components
│   │   │   ├── ClaimsWidget.jsx
│   │   │   ├── PostureScore.jsx
│   │   │   ├── SecurityFeed.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── vite.config.js
├── hardhat.config.js
├── package-lock.json
├── package.json
├── scripts
│   ├── deploy.js
│   └── test-connection.js
├── snapshot.md
├── snapshot.py
├── test
├── test_key_output.txt
├── test_out.txt
└── test_output.txt
```

## 2. Python Backend (`backend/*.py`)

### `backend/main.py`
```python
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
```

### `backend/notarizer.py`
```python
import os
import json
import time
import asyncio
import hashlib
import logging
from datetime import datetime
from pathlib import Path
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import hasher
import blockchain

# Module level lock for sequence integrity
# Single worker only — see startup constraint
sequence_lock = asyncio.Lock()

class Notarizer:
    def __init__(self, queue: asyncio.Queue, audit_log_dir: str = "backend/audit_log"):
        self.queue = queue
        self.audit_log_dir = Path(audit_log_dir)
        self.audit_log_dir.mkdir(parents=True, exist_ok=True)
        self.scheduler = AsyncIOScheduler()
        
        self.sequence_file = self.audit_log_dir / "sequence.json"
        self.gap_alerts_file = self.audit_log_dir / "gap_alerts.json"
        
        self.last_event_id = self._load_last_id()
        self.last_committed_batch_timestamp = 0
        self.gap_detected = False
        self.gap_count = 0

    def _load_last_id(self) -> int:
        if self.sequence_file.exists():
            try:
                with open(self.sequence_file, "r") as f:
                    return json.load(f).get("last_event_id", -1)
            except Exception:
                pass
        return -1

    def _save_last_id(self, event_id: int):
        temp_file = self.sequence_file.with_suffix(".tmp")
        data = {"last_event_id": event_id, "updated_at": int(time.time())}
        with open(temp_file, "w") as f:
            json.dump(data, f)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp_file, self.sequence_file)

    async def get_next_id(self) -> int:
        async with sequence_lock:
            self.last_event_id += 1
            self._save_last_id(self.last_event_id)
            return self.last_event_id

    def start(self):
        # Batching interval of 60 seconds
        self.scheduler.add_job(self.run_batch, 'interval', seconds=60, max_instances=1, coalesce=True)
        self.scheduler.start()
        print("[Notarizer] Background service started.")

    async def run_batch(self):
        events = []
        while not self.queue.empty():
            events.append(await self.queue.get())

        if not events:
            return

        events.sort(key=lambda x: x['event_id'])
        
        # Merkle Tree Construction
        event_hashes = []
        for event in events:
            payload = f"{event['event_id']}{event['instruction_hash']}{event['context_hash']}{event['reasoning_hash']}{event['action_hash']}{event['risk_level']}{event['timestamp']}{event['agent_name']}"
            event_hash = "0x" + hashlib.sha256(b"\x00" + payload.encode()).hexdigest()
            event['event_hash'] = event_hash 
            event_hashes.append(event_hash)

        merkle_root = self._build_merkle_root(event_hashes)
        
        try:
            batch_id = blockchain.record_batch_root(merkle_root)
            self.last_committed_batch_timestamp = int(time.time())
        except Exception as e:
            batch_id = -1

        timestamp = int(time.time())
        batch_data = {
            "batch_id": batch_id,
            "merkle_root": merkle_root,
            "timestamp": timestamp,
            "event_count": len(events),
            "events": events
        }
        
        file_path = self.audit_log_dir / f"batch_{timestamp}.json"
        with open(file_path, "w") as f:
            json.dump(batch_data, f, indent=4)

    def _build_merkle_root(self, leaves: list[str]) -> str:
        if not leaves: return "0x" + hashlib.sha256(b"\x00").hexdigest()
        current_level = [bytes.fromhex(l.replace('0x', '')) for l in leaves]
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                next_level.append(hashlib.sha256(b"\x01" + left + right).digest())
            current_level = next_level
        return "0x" + current_level[0].hex()

    def get_sequence_status(self) -> dict:
        return {
            "last_committed_event_id": self.last_event_id,
            "last_committed_batch_timestamp": self.last_committed_batch_timestamp,
            "any_gaps_detected": self.gap_detected,
            "gap_count": self.gap_count
        }

    def get_event_proof(self, event_hash: str):
        for log_file in sorted(self.audit_log_dir.glob("batch_*.json"), reverse=True):
            with open(log_file, "r") as f:
                batch = json.load(f)
            hashes = [e["event_hash"] for e in batch["events"]]
            if event_hash in hashes:
                index = hashes.index(event_hash)
                proof = self._calculate_merkle_proof(hashes, index)
                return {"event": batch["events"][index], "merkle_root": batch["merkle_root"], "proof": proof}
        return None

    def _calculate_merkle_proof(self, leaves: list[str], index: int) -> list[dict]:
        proof = []
        current_level = [bytes.fromhex(l.replace('0x', '')) for l in leaves]
        curr_idx = index
        while len(current_level) > 1:
            next_level = []
            for i in range(0, len(current_level), 2):
                left = current_level[i]
                right = current_level[i + 1] if i + 1 < len(current_level) else left
                if i == curr_idx or i + 1 == curr_idx:
                    sibling = right if i == curr_idx else left
                    direction = "right" if i == curr_idx else "left"
                    proof.append({"hash": "0x" + sibling.hex(), "direction": direction})
                next_level.append(hashlib.sha256(b"\x01" + left + right).digest())
            current_level = next_level
            curr_idx //= 2
        return proof
```

### `backend/blockchain.py`
```python
import json
import os
import logging
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

# Global state
w3 = Web3(Web3.HTTPProvider(os.getenv("HARDHAT_RPC_URL", "http://127.0.0.1:8545")))
BLOCKCHAIN_AVAILABLE = False
audit_registry = None
governance = None
posture_registry = None
claims_processor = None
policy_engine = None

logger = logging.getLogger("blockchain")

def get_contract_abi(contract_name: str) -> list:
    """Loads the ABI from the Hardhat artifacts folder."""
    base_path = Path(__file__).parent.parent
    artifact_path = base_path / "artifacts" / "contracts" / f"{contract_name}.sol" / f"{contract_name}.json"
    if not artifact_path.exists():
        raise FileNotFoundError(f"Could not find artifact for {contract_name}")
    with open(artifact_path, "r") as f:
        data = json.load(f)
    return data["abi"]

def init_blockchain():
    global BLOCKCHAIN_AVAILABLE, audit_registry, governance, posture_registry, claims_processor, policy_engine
    if not w3.is_connected():
        BLOCKCHAIN_AVAILABLE = False
        return
    try:
        w3.eth.default_account = w3.eth.accounts[0]
        addr_path = Path(__file__).parent / "deployed_addresses.json"
        with open(addr_path, "r") as f:
            addresses = json.load(f)
        def load_contract(name, key):
            abi = get_contract_abi(name)
            return w3.eth.contract(address=addresses[key], abi=abi)
        audit_registry = load_contract("AuditRegistry", "AuditRegistry")
        governance = load_contract("Governance", "Governance")
        posture_registry = load_contract("PostureRegistry", "PostureRegistry")
        claims_processor = load_contract("ClaimsProcessor", "ClaimsProcessor")
        policy_engine = load_contract("PolicyEngine", "PolicyEngine")
        BLOCKCHAIN_AVAILABLE = True
    except Exception as e:
        BLOCKCHAIN_AVAILABLE = False

def record_batch_root(merkle_root: str) -> int:
    """Submits a Merkle root for a batch of events to AuditRegistry."""
    if not BLOCKCHAIN_AVAILABLE or not audit_registry: return -1
    try:
        tx_hash = audit_registry.functions.recordBatchRoot(Web3.to_bytes(hexstr=merkle_root)).transact()
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        logs = audit_registry.events.BatchLogged().process_receipt(receipt)
        return logs[0]['args']['batchId'] if logs else -1
    except Exception as e:
        return -1
```

## 3. Smart Contracts (`contracts/*.sol`)

### `AuditRegistry.sol`
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AuditRegistry {
    enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

    struct AuditEntry {
        bytes32 instructionHash;
        bytes32 contextHash;
        bytes32 reasoningHash;
        bytes32 actionHash;
        bytes32 resultHash;
        RiskLevel riskLevel;
        uint256 timestamp;
        address submitter;
        bool resultLogged;
    }

    mapping(uint256 => AuditEntry) private entries;
    uint256 public entryCount;
    mapping(uint256 => bytes32) public batchRoots;
    uint256 public batchCount;

    event ActionLogged(uint256 indexed entryId, RiskLevel riskLevel, address submitter);
    event BatchLogged(uint256 indexed batchId, bytes32 merkleRoot, uint256 timestamp);

    function recordBatchRoot(bytes32 _merkleRoot) external returns (uint256 batchId) {
        batchId = batchCount++;
        batchRoots[batchId] = _merkleRoot;
        emit BatchLogged(batchId, _merkleRoot, block.timestamp);
    }

    function logAction(bytes32 _instructionHash, bytes32 _contextHash, bytes32 _reasoningHash, bytes32 _actionHash, uint8 _riskLevel) external returns (uint256 entryId) {
        require(_riskLevel <= 3, "Invalid risk level");
        entryId = entryCount++;
        entries[entryId] = AuditEntry({
            instructionHash: _instructionHash,
            contextHash: _contextHash,
            reasoningHash: _reasoningHash,
            actionHash: _actionHash,
            resultHash: bytes32(0),
            riskLevel: RiskLevel(_riskLevel),
            timestamp: block.timestamp,
            submitter: msg.sender,
            resultLogged: false
        });
        emit ActionLogged(entryId, RiskLevel(_riskLevel), msg.sender);
    }
    
    function getEntry(uint256 _entryId) external view returns (AuditEntry memory) {
        require(_entryId < entryCount, "Entry does not exist");
        return entries[_entryId];
    }
}
```

## 4. Hardhat Configuration
### `hardhat.config.js`
```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};
```
