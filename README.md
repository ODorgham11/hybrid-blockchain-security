# Aegis OS: Hybrid AI & Blockchain Cyber Insurance System

Welcome to **Aegis OS**, a trustless, automated cyber insurance lifecycle platform. This project bridges the gap between AI-driven security analysis and immutable blockchain-based insurance payouts.

## 🏗️ Architectural Overview

Aegis OS operates on a **Three-Pillar Accountability Model**:

1. **The AI Layer (Non-Repudiable Reasoning)**: Python-based AI agents act as the operational core, analyzing fraud risk and verifying security posture. All AI reasoning is logged off-chain and its integrity is anchored on-chain via Merkle Roots.
2. **The Cyber Layer (Bilateral Compliance)**: Standardizes security hygiene metrics. If a client follows instructions but is breached, the AI takes the blame. If the client ignores instructions, their Security Hygiene Score (SHS) drops and claims are denied.
3. **The Blockchain Layer (Immutable Arbiter)**: Built on Hardhat. The `ClaimsProcessor` smart contract automatically adjudicates claims and triggers payouts using our custom ERC20 token, **CyberToken (CIT)**.

## 🚀 Quick Start Guide (Local Execution)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python](https://www.python.org/) (v3.10+ recommended)
- [MetaMask](https://metamask.io/) browser extension

### 1. Blockchain Setup (Terminal 1)
First, install dependencies and start the local Hardhat blockchain.
```bash
npm install
npx hardhat node
```
*Keep this terminal running. It hosts your local blockchain on `http://127.0.0.1:8545` (Chain ID: 1337).*

### 2. Smart Contract Deployment (Terminal 2)
In a new terminal, deploy the contracts and fund the Claims Processor.
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*This script will automatically generate `backend/deployed_addresses.json` and update your `.env` file.*

### 3. Backend Setup (Terminal 3)
Set up your Python environment and start the FastAPI backend.
```bash
cd backend
python -m venv .venv
# Activate venv (Windows: .venv\Scripts\activate | Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --workers 1
```

### 4. Frontend Setup (Terminal 4)
Start the React dashboard.
```bash
cd frontend
npm install
npm run dev
```

## 🌍 Testnet Deployment (Sepolia)

To deploy this project to the Ethereum Sepolia testnet for production testing:

1. **Environment Variables**: Open your `.env` file in the root directory and add:
   ```env
   ALCHEMY_API_KEY="YOUR_ALCHEMY_API_KEY"
   PRIVATE_KEY="YOUR_METAMASK_PRIVATE_KEY"
   ```
2. **Run Deployment Script**:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```
3. **Frontend Integration**: The newly generated Sepolia contract addresses will automatically be saved to `backend/deployed_addresses.json`. Update your `App.jsx` with these new addresses to test via the Sepolia network.

## 🦊 MetaMask Configuration
1. Open MetaMask and add a custom network:
   - **Network Name**: Hardhat Localhost
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `1337`
   - **Currency Symbol**: `ETH`
2. Import an account using one of the private keys provided by the `npx hardhat node` terminal.
3. Switch your MetaMask network to the newly created Hardhat Localhost.

## 📜 Core Scripts
- `scripts/setup-policy.js`: Assigns an active insurance policy to a company wallet.
- `scripts/process-claims.js`: The batch processor that evaluates pending claims, checks SHS scores, verifies AI fraud reports, and executes CIT token payouts.

## 🤝 Contributing
Make sure to create a new branch for any feature work. Ensure all new smart contract functions include full NatSpec documentation and adhere to the Checks-Effects-Interactions (CEI) pattern.
