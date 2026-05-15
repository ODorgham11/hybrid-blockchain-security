# Aegis OS — Hybrid Blockchain Security & Cyber Insurance Platform

Aegis OS is a full-stack prototype that combines AI-assisted security operations with blockchain-based insurance automation. The platform records AI security decisions, evaluates claim risk, and executes policy-driven payouts through smart contracts to improve transparency and accountability.

## Why this project

Traditional cyber insurance workflows are opaque and slow. Aegis OS introduces a verifiable pipeline where:
- AI agents analyze alerts, logs, and claims
- Critical decision artifacts are hashed and anchored for integrity
- Smart contracts enforce policy checks and payout rules
- Frontend dashboards provide operational and audit visibility

## Core architecture

### 1) AI & Backend Layer (Python / FastAPI)
- Processes security alerts, daily logs, and claim analysis requests
- Produces reasoning and risk outputs via specialized agents
- Persists operational events and exposes API endpoints for UI and automation

### 2) Trust & Notarization Layer
- Hashes decision artifacts and creates verifiable event traces
- Supports integrity checks for historical AI decisions

### 3) Blockchain Enforcement Layer (Solidity / Hardhat)
- Manages policy state and security posture registries
- Records audit actions on-chain
- Adjudicates claims and triggers ERC-20 token payouts

### 4) Frontend Layer (React / Vite)
- Provides admin and client dashboards
- Supports claim workflows, monitoring views, and blockchain interaction

## Repository structure

```text
backend/      FastAPI services, AI agents, notarization, and data access
contracts/    Solidity contracts (claims, policy, audit, posture, token)
frontend/     React dashboard application
scripts/      Deployment and setup scripts for local/testnet workflows
docs/         Generated and supplementary project documentation
```

## Technology stack

- **Smart contracts:** Solidity, Hardhat, OpenZeppelin
- **Backend:** Python, FastAPI, Web3.py, LangChain
- **Frontend:** React, Vite, Ethers.js
- **Data/integrity:** SQLite-style persistence utilities, hashing and notarization pipeline

## Quick start (local development)

### Prerequisites
- Node.js 18+
- Python 3.10+
- MetaMask (for local chain interaction)

### 1. Start the local blockchain
```bash
npm install
npx hardhat node
```

### 2. Deploy contracts
In a new terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Start the backend
In another terminal:
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --workers 1
```

### 4. Start the frontend
In another terminal:
```bash
cd frontend
npm install
npm run dev
```

## Testnet deployment (Sepolia)

1. Add required variables to root `.env`:
   ```env
   ALCHEMY_API_KEY="YOUR_ALCHEMY_API_KEY"
   PRIVATE_KEY="YOUR_PRIVATE_KEY"
   ```
2. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

## Useful scripts

- `npm test` — runs Hardhat contract tests
- `scripts/setup-policy.js` — assigns policy state for a company wallet
- `scripts/process-claims.js` — processes pending claims and executes payouts
- `scripts/seed-audit-data.js` — seeds audit trail data for local testing

## Documentation

- `docs/index.md` — generated Solidity API docs
- `docs/Gas_Forensics_Report.md` — gas analysis notes
- `docs/UI_Test_Scenarios.md` — UI testing scenarios

## Contributing

Contributions are welcome. Please use a feature branch and keep contract changes documented with NatSpec where applicable.
