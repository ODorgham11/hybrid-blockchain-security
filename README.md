# Aegis OS — Hybrid Blockchain Security & Cyber Insurance Platform

Aegis OS is a full-stack prototype that combines AI-assisted security operations with blockchain-enforced cyber insurance logic.  
It links **AI decisioning**, **cryptographic notarization**, and **smart-contract claims processing** into one verifiable workflow.

---

## Project Goals

- Reduce opacity in cyber insurance decisions
- Preserve integrity of AI-generated actions and reasoning metadata
- Enforce policy and payout logic on-chain
- Provide admin/client operational visibility through a web dashboard

---

## System Architecture

### Layered Overview

| Layer | Main Components | Responsibility |
|---|---|---|
| Frontend | React + Vite (`frontend/`) | Admin/client UI, wallet interaction, API + chain data views |
| Backend AI/API | FastAPI + AI agents (`backend/`) | Alert analysis, anomaly detection, fraud scoring, system API |
| Integrity/Notarization | `backend/notarizer.py`, hashing utils | Event sequencing, Merkle root generation, batch audit logs |
| Blockchain | Solidity contracts + Hardhat | Immutable AI audit logs, posture/policy state, claim adjudication, token payouts |
| Persistence | SQLite (`backend/aegis.db`) + JSON logs | Decision history, activity feed, alerts, claim analyses, batch files |

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Vite)                      │
│ Admin + Client Dashboards, Wallet Connect, API/Chain Views         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (Axios)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI / AI)                       │
│ Endpoints + SecurityAgent + AnomalyDetector + FraudAnalyzer        │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │                               │
                │ SQLite writes                 │ Web3 interactions
                ▼                               ▼
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│        SQLite (aegis.db)      │   │   Smart Contracts (Hardhat)      │
│ decisions/actions/alerts/etc. │   │ Audit, Policy, Posture, Claims,  │
└───────────────────────────────┘   │ Governance, Daily Reports, Token │
                                    └───────────────┬──────────────────┘
                                                    │
                                                    ▼
                                    ┌──────────────────────────────────┐
                                    │ Notarizer + Merkle Batch Logs    │
                                    │ sequence.json, gap_alerts, batch │
                                    └──────────────────────────────────┘
```

### Runtime Data Flow

1. Frontend sends security/claim inputs to FastAPI.
2. AI agents produce structured outputs (or mock fallback when LLM unavailable).
3. Backend stores full records in SQLite.
4. High-risk events are hashed, queued, and notarized into Merkle batches.
5. Blockchain registries/contracts are updated for auditability and claims execution.
6. Dashboards read API data + on-chain state for monitoring and governance workflows.

---

## Repository & File Architecture

```text
.
├── backend/
│   ├── main.py                    # FastAPI app, lifecycle, and API endpoints
│   ├── database.py                # SQLite schema + data access layer
│   ├── blockchain.py              # Web3 init + contract interaction helpers
│   ├── notarizer.py               # Event queue, sequence integrity, Merkle batching
│   ├── hasher.py                  # SHA-256 helpers
│   ├── deployed_addresses.json    # Contract addresses used by backend/scripts
│   ├── requirements.txt           # Python dependencies
│   └── agents/
│       ├── security_agent.py      # Alert triage and action recommendations
│       ├── anomaly_detector.py    # Daily log anomaly analysis
│       └── fraud_analyzer.py      # Claim fraud scoring + recommendation
├── contracts/
│   ├── ClaimsProcessor.sol
│   ├── PolicyEngine.sol
│   ├── PostureRegistry.sol
│   ├── AuditRegistry.sol
│   ├── Governance.sol
│   ├── DailyReportRegistry.sol
│   ├── CyberToken.sol
│   └── MaliciousAttacker.sol      # Security test contract
├── scripts/
│   ├── deploy.js                  # Deploy full protocol stack
│   ├── setup-policy.js            # Configure company policy
│   ├── setup-test-data.js         # Create local demo state
│   ├── process-claims.js          # Batch process pending claims
│   ├── seed-audit-data.js         # Seed audit/posture/report test data
│   └── generate_docs.py           # Docs generation helper
├── frontend/
│   ├── src/App.jsx                # App shell + role-based page routing
│   ├── src/api/backend.js         # FastAPI client calls
│   ├── src/config.js              # Contract addresses and ABI fragments
│   └── src/pages/                 # Admin and client feature pages
├── docs/
│   ├── index.md                   # Generated Solidity API documentation
│   ├── Gas_Forensics_Report.md
│   └── UI_Test_Scenarios.md
├── test/                          # Hardhat test suites
├── hardhat.config.js
└── package.json
```

---

## Smart Contract Specifications

| Contract | Role | Key Functions |
|---|---|---|
| `CyberToken` | ERC-20 payout asset (`CIT`) | `mint` |
| `PolicyEngine` | Insurer-defined policy rules per company | `setPolicy`, `getPolicy`, `isPolicyActive` |
| `PostureRegistry` | Security posture snapshots and SHS scoring | `recordSnapshot`, `getLastSnapshot`, `getSecurityHygieneScore` |
| `AuditRegistry` | Immutable AI action hash logging | `logAction`, `getEntry`, `getActionCountByTimeRange` |
| `Governance` | Human approval/rejection for high-risk AI actions | `requestApproval`, `approve`, `reject` |
| `ClaimsProcessor` | Hybrid claim decisioning + payout execution | `fileClaim`, `recordFraudScore`, `processClaim`, `getClaim` |
| `DailyReportRegistry` | On-chain daily aggregate report roots | `submitDailyReport`, `getReport`, `getCurrentDay` |
| `MaliciousAttacker` | Adversarial test harness | `attack` / reentrancy behavior simulation |

---

## Backend API Specifications

Base URL: `http://127.0.0.1:8000`

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/analyze-alert` | Analyze a threat alert via `SecurityAgent` |
| POST | `/api/analyze-daily-logs` | Analyze daily logs via `AnomalyDetector` |
| POST | `/api/analyze-claim` | Analyze a claim via `FraudAnalyzer` |
| GET | `/api/sequence-status` | View notarization sequence/gap status |
| GET | `/api/verify-event/{event_hash}` | Fetch Merkle proof payload for an event hash |
| GET | `/api/db-dump` | Dump AI decision records with computed hashes |
| GET | `/api/activity-feed` | Unified system activity feed |
| GET | `/api/ai-decisions` | Recent AI decisions |
| GET | `/api/claim-analysis/{claim_id}` | Fraud analysis details for one claim |
| GET | `/api/alerts` | Recent raw security alerts |
| GET | `/api/system-stats` | Aggregate dashboard metrics |
| GET | `/` | Health status |

---

## Database Schema (SQLite)

Database file: `backend/aegis.db`

| Table | Purpose |
|---|---|
| `ai_decisions` | Stores full AI reasoning/action outputs with risk metadata |
| `security_alerts` | Raw incoming alerts and processing linkage |
| `system_actions` | Operational actions and statuses for activity timeline |
| `claim_analyses` | Fraud scores/reports and recommendations per claim |
| `daily_summaries` | Daily aggregate metrics and notarization state |

---

## Technology Stack

| Domain | Technologies |
|---|---|
| Smart contracts | Solidity `0.8.28`, Hardhat, OpenZeppelin |
| Backend | Python, FastAPI, Web3.py, LangChain, `langchain-google-genai` |
| Frontend | React, Vite, Ethers.js, Axios, Recharts |
| Storage & integrity | SQLite, JSON batch logs, SHA-256, Merkle tree batching |

---

## Environment Variables

Configured/used by runtime and scripts:

| Variable | Used In | Purpose |
|---|---|---|
| `ALCHEMY_API_KEY` | `hardhat.config.js` | Sepolia RPC URL composition |
| `PRIVATE_KEY` | `hardhat.config.js`, `backend/agents/fraud_analyzer.py` | Deployer/signing key |
| `HARDHAT_RPC_URL` | `backend/blockchain.py` | Backend chain provider URL (default local 8545) |
| `POLICY_ENGINE_ADDRESS` | `scripts/setup-policy.js` | Direct policy setup script target |
| `AUDIT_REGISTRY_ADDRESS` | `scripts/deploy.js` update flow | Written into `.env` after deployment |
| `GOVERNANCE_ADDRESS` | `scripts/deploy.js` update flow | Written into `.env` after deployment |
| `POSTURE_REGISTRY_ADDRESS` | `scripts/deploy.js` update flow | Written into `.env` after deployment |
| `CLAIMS_PROCESSOR_ADDRESS` | `scripts/deploy.js` update flow | Written into `.env` after deployment |
| `CYBER_TOKEN_ADDRESS` | `scripts/deploy.js` update flow | Written into `.env` after deployment |

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- MetaMask (for browser wallet interaction)

### 1) Install dependencies

```bash
# root (hardhat/contracts)
npm install

# backend (Python dependencies)
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cd ..

# frontend
cd frontend
npm install
cd ..
```

## Required Libraries to Install

This project has **three dependency groups**: root smart-contract toolchain, backend Python stack, and frontend UI stack.

### A) Root (Hardhat / contracts)

Install from root `package.json`:

- `hardhat`
- `@nomicfoundation/hardhat-toolbox`
- `@openzeppelin/contracts`
- `dotenv`
- `solidity-docgen`

Install command:

```bash
cd /home/runner/work/hybrid-blockchain-security/hybrid-blockchain-security
npm install
```

### B) Backend (Python / FastAPI / AI)

Install from `backend/requirements.txt`:

- `fastapi==0.109.0`
- `uvicorn==0.27.0`
- `langchain==0.1.0`
- `langchain-google-genai==0.0.13`
- `langchain-core==0.1.0`
- `web3==6.11.3`
- `apscheduler==3.10.4`
- `python-dotenv==1.0.0`
- `pydantic==2.5.0`
- `google-genai==0.3.0`
- `cryptography==41.0.7`

Install command:

```bash
cd /home/runner/work/hybrid-blockchain-security/hybrid-blockchain-security/backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

### C) Frontend (React / Vite)

Install from `frontend/package.json`:

- `react`, `react-dom`
- `vite`, `@vitejs/plugin-react`
- `ethers`
- `axios`
- `recharts`
- `lucide-react`
- `eslint` + related plugins/config packages

Install command:

```bash
cd /home/runner/work/hybrid-blockchain-security/hybrid-blockchain-security/frontend
npm install
```

### 2) Run local blockchain

```bash
npx hardhat node
```

### 3) Deploy contracts to localhost

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 4) Start backend API

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --workers 1
```

> `--workers 1` is required by this backend’s sequence-lock/notarization design.

### 5) Start frontend

```bash
cd frontend
npm run dev
```

---

## Operational Scripts

| Script | What it does |
|---|---|
| `npm test` | Runs Hardhat smart contract tests |
| `scripts/deploy.js` | Deploys all core contracts and writes addresses |
| `scripts/setup-policy.js` | Sets policy rules for a company wallet |
| `scripts/setup-test-data.js` | Seeds local policy + posture data for demo |
| `scripts/seed-audit-data.js` | Seeds audit entries, daily reports, posture snapshots |
| `scripts/process-claims.js` | Processes all pending claims and executes payouts |

---

## Testnet Deployment (Sepolia)

1. Add values in root `.env`:

```env
ALCHEMY_API_KEY="YOUR_ALCHEMY_API_KEY"
PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
```

2. Deploy:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

---

## Additional Documentation

- `docs/index.md` — generated Solidity API docs
- `docs/Gas_Forensics_Report.md` — gas analysis notes
- `docs/UI_Test_Scenarios.md` — UI test scenarios

---

## Contributing

Contributions are welcome.  
Use a feature branch and keep contract changes documented with NatSpec where applicable.
