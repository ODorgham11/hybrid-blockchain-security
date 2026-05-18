# Master System Specifications
**Project:** Hybrid AI-Blockchain Cyber Insurance (AID 325)
**Status:** Completed

---

## 1. SMART CONTRACT LAYER (Solidity Architecture)

The system deploys eight specific Solidity contracts. All contracts utilize NatSpec documentation (`@title`, `@notice`, `@dev`, `@param`, `@return`, and `@custom:security`).

### Contracts & Architecture

1. **`CyberToken.sol`** (ERC20, Ownable)
   - **State Variables:** Initial supply minted to the deployer.
   - **Functions:** `mint(address to, uint256 amount)`
   - **Access Control:** `onlyOwner`.

2. **`AuditRegistry.sol`**
   - **Structs:** `AuditEntry` (instructionHash, contextHash, reasoningHash, actionHash, riskLevel, timestamp).
   - **Enums:** `RiskLevel` (LOW, MEDIUM, HIGH, CRITICAL).
   - **State Variables:** `AuditEntry[] public entries`, `address public owner`.
   - **Functions:** `logAction`, `getActionCountByTimeRange`, `getEntryCount`, `getEntry`.

3. **`PostureRegistry.sol`**
   - **Structs:** `PostureSnapshot` (merkleRoot, timestamp, company, complianceScore).
   - **Mappings:** `mapping(address => PostureSnapshot[]) private snapshots`.
   - **Functions:** `recordSnapshot`, `getLastSnapshot`, `getSnapshotCount`, `getSnapshotByIndex`, `getSecurityHygieneScore`.

4. **`PolicyEngine.sol`**
   - **Structs:** `PolicyRule` (ruleName, required, maxAgeSeconds, weight).
   - **Mappings:** `mapping(address => PolicyRule[]) private companyPolicies`, `mapping(address => bool) public isPolicyActive`.
   - **State Variables:** `address public immutable insurer`.
   - **Access Control:** `onlyInsurer`.
   - **Functions:** `setPolicy`, `getPolicy`.

5. **`ClaimsProcessor.sol`** (ReentrancyGuard)
   - **Structs:** `Claim` (company, breachTimestamp, attackType, claimedAmount, verdict, payoutPercentage, fraudScore, fraudReportHash, processedAt).
   - **Enums:** `Verdict` (PENDING, APPROVED, PARTIAL, DENIED).
   - **Mappings:** `mapping(uint256 => Claim) private claims`.
   - **State Variables:** `uint256 public claimCount`, `address public backendSystem`. Immutable references to `postureRegistry`, `policyEngine`, `auditRegistry`, and `cyberToken`.
   - **Access Control:** `onlyBackend`, `nonReentrant`.
   - **Functions:** `fileClaim`, `recordFraudScore`, `processClaim`, `getClaim`.

6. **`Governance.sol`**
   - **Mappings:** `mapping(address => bool) public authorizedSigners`, `mapping(uint256 => bool) public pendingApprovals`, `mapping(uint256 => bool) public approvedActions`.
   - **State Variables:** `address public immutable owner`, `AuditRegistry public immutable auditRegistry`.
   - **Access Control:** `onlyOwner`, `onlySigner`.
   - **Functions:** `addSigner`, `removeSigner`, `requestApproval`, `approve`, `reject`.

7. **`DailyReportRegistry.sol`**
   - **Structs:** `DailyReport` (reportHash, timestamp, totalActions, avgRiskLevel, submitted).
   - **Mappings:** `mapping(uint256 => DailyReport) public dailyReports`.
   - **State Variables:** `uint256 public currentDay`, `address public backendSystem`.
   - **Access Control:** `onlyBackend`.
   - **Functions:** `submitDailyReport`, `getReport`, `getCurrentDay`.

8. **`MaliciousAttacker.sol`**
   - Used specifically in the test suite to simulate a reentrancy attack against the `ClaimsProcessor`.
   - **State Variables:** `ClaimsProcessor public targetContract`, `uint256 public attackClaimId`.
   - **Functions:** `deployTarget`, `recordFraudScore`, `attack`, `fallback() external`.

### Checks-Effects-Interactions (CEI) & ReentrancyGuard
The `ClaimsProcessor.processClaim()` function strictly adheres to the CEI pattern:
- **Checks:** Validates claim ID, ensures the claim is `PENDING`, verifies `fraudReportHash` exists.
- **Effects:** Evaluates the claim against SHS, AI Fraud Risk, and Audit actions. Updates the `Claim` state (`verdict`, `payoutPercentage`, `processedAt`).
- **Interactions:** If a payout is approved, it performs `cyberToken.transfer(claim.company, payoutAmount)`.
- **Security:** The `nonReentrant` modifier from OpenZeppelin ensures that if the token transfer attempts to recursively call `processClaim`, execution reverts.

---

## 2. THE HYBRID INTEGRATION LOGIC (The Core Value)

The exact flow inside `ClaimsProcessor.processClaim()` combines on-chain state with off-chain AI verifications:

1. **Security Hygiene Score (SHS) Retrieval:**
   - Calls `postureRegistry.getSecurityHygieneScore(claim.company)`. This calculates a 90-day rolling average of compliance scores submitted.

2. **10% Active Defense Boost:**
   - Calculates the start time: 7 days prior to the `breachTimestamp`.
   - Queries the immutable `auditRegistry` interface: `auditRegistry.getActionCountByTimeRange(startTime, claim.breachTimestamp)`.
   - **Math Flow:** If `aiActions > 5`, it applies a 10-point bonus to the SHS (e.g., `uint16 boostedSHS = uint16(shs) + 10`). The score is hard-capped at 100.

3. **Denial & Approval Conditions:**
   - **Absolute Denial:** If `aiFraudRisk > 75`, the verdict is instantly `DENIED` with a 0% payout.
   - **Full Approval:** If the boosted SHS is `>= 90` AND `aiFraudRisk < 30`, the claim is `APPROVED` at `100%` payout.
   - **Partial Payout:** If SHS `>= 50` and the above don't apply, the claim is given a `PARTIAL` verdict. The `payoutPercentage` matches the SHS, calculating: `(claim.claimedAmount * shs) / 100`.
   - **Hygiene Failure:** If SHS `< 50`, the claim is `DENIED` at `0%` payout.

---

## 3. OFF-CHAIN BACKEND (Python FastAPI & AI)

The backend utilizes FastAPI to interface with Gemini-Flash AI and orchestrate SQLite persistence.

### Endpoints (`main.py`)
- `POST /api/analyze-alert`: Passes raw alert string/context to `SecurityAgent`.
- `POST /api/analyze-daily-logs`: Passes daily telemetry to `AnomalyDetector`.
- `POST /api/analyze-claim`: Passes incident data to `FraudAnalyzer`.
- **Read APIs:** `/api/activity-feed`, `/api/ai-decisions`, `/api/claim-analysis/{claim_id}`, `/api/alerts`, `/api/system-stats`.
- **System APIs:** `/api/sequence-status`, `/api/verify-event/{event_hash}`, `/api/db-dump`, `/` (health check).

### Python AI Agents
1. **`security_agent.py`:** Uses LangChain to evaluate active threats. If `risk_level >= 2` (High/Critical), it immediately logs the hashed instruction, context, reasoning, and action directly to the `AuditRegistry` via `blockchain.log_ai_action()`.
2. **`anomaly_detector.py`:** Evaluates massive JSON log dumps for stealthy intrusions. Triggers the same blockchain audit if an anomaly is definitively detected.
3. **`fraud_analyzer.py`:** Calculates a 0-100 fraud score. Crucially, it constructs a Raw Transaction calling `ClaimsProcessor.recordFraudScore()`, signs it using the backend `PRIVATE_KEY`, and dispatches it directly to the local node to finalize the claim payload.

### SQLite Persistence (`database.py` Schema)
The backend maintains local state before finalizing on-chain using five core tables:
- **`ai_decisions`**: Logs event ID, agent name, instruction prompt, context, reasoning, action taken, risk level, claim ID, and timestamp.
- **`security_alerts`**: Tracks raw alerts, context, status, and linked `decision_id`.
- **`system_actions`**: Tracks parsed action types (e.g., `FIREWALL_BLOCK`), target, description, triggering agent, and status.
- **`claim_analyses`**: Ensures unique storage of `claim_id` with its fraud score, reasoning, and AI recommendation.
- **`daily_summaries`**: Tracks high-risk counts, average risk levels, and notarization status.

### Cryptography & Notarization
- **`hasher.py`:** Implements `sha256` hashing. Before the AI logic touches the blockchain, all potentially sensitive data is condensed into privacy-preserving hashes.
- **`notarizer.py`:** Maintains an `asyncio.Queue`. While High/Critical events are logged instantly, lower-risk events are batched sequentially by this background service.

---

## 4. FULL-STACK WALLET INTEGRATION (React Frontend)

### Component Structure
- **App.jsx:** The core application router. Handles global state for `account`, `role`, and Web3 `provider`. Conditionally renders Persistent Components (`ThreatSimulator`, `LiveChainVisualizer`) to keep WebSockets alive in the background.
- **Admin Pages:** `AdminDashboard`, `PolicyManager`, `ClaimsAdmin`, `AuditTrail`, `ChainExplorer`, `ActivityFeed`, `DatabaseViewer`.
- **Client Pages:** `ClientDashboard`, `FileClaim`, `MyClaims`.
- **Widgets:** `ClaimsWidget` (used to interface with the processor contract), `StatusBadge`.

### Web3 & `ethers.js` (v6) implementation
- Instantiates a BrowserProvider: `new ethers.BrowserProvider(window.ethereum)`.
- Connects to contracts via `new ethers.Contract(address, ABI, signer)`.

### MetaMask Orchestration
- Satisfies dynamic lifecycle requirements directly in the `App.jsx` `useEffect` hook.
- Implements: `window.ethereum.on('accountsChanged', () => window.location.reload())`
- Implements: `window.ethereum.on('chainChanged', () => window.location.reload())`
- Provides absolute state refresh to prevent stale contract interactions when switching from "Admin" accounts to "Client" accounts.

### Transaction Feedback Loop
Inside `ClaimsWidget.jsx` (and similar transaction components):
- **Loading State:** `setLoading(true)` triggers UI changes, changing the button text to "Processing Transaction..." and disabling clicks via CSS `cursor: not-allowed`.
- **Pending Status:** Utilizes the asynchronous `await tx.wait()` promise to block UI progression until the block is mined.
- **Success:** Captures `tx.hash` and displays a green `<div className="success">` element containing the finalized transaction hash.
- **Error Handling:** `try/catch` catches revert data and displays an `alert()` advising the user on policy violations.

---

## 5. AUTOMATED TESTING SUITE

### Infrastructure (`hardhat.config.js`)
- Configured for Solidity `0.8.28`.
- Exposes standard `localhost:8545` for local backend interactions.
- Configures `sepolia` utilizing `process.env.ALCHEMY_API_KEY` and `PRIVATE_KEY` for live deployment testing.
- Uses `solidity-docgen` for automated contract documentation output.

### Exhaustive Testing Block 1 (`ClaimsProcessor.test.js`)
1. **Happy Path (Fully Compliant):** Asserts verdict `1 (APPROVED)` and Token balance verifies 100% of the `claimedAmount`.
2. **Partial Path (Edge Case):** Asserts verdict `2 (PARTIAL)` and Token balance verifies exactly 66% mathematically evaluated by big int mapping.
3. **Negligence (Edge Case):** Asserts verdict `3 (DENIED)` and Token balance verifies a strict 0 transfer.
4. **Reentrancy Attack Blocked (Security):** Deploys `MaliciousAttacker.sol` acting as both a backend and rogue registry. Testing framework leverages `expect(...).to.be.revertedWithCustomError` specifically checking for the OpenZeppelin v5 `"ReentrancyGuardReentrantCall"` exception.

### Exhaustive Testing Block 2 (`HybridSecurity.test.js`)
1. **Policy Setup & Claim Filing:** Verifies that an insurer can `setPolicy` and a company can `fileClaim`. Validates the emission of the `ClaimFiled` event.
2. **Claim Processing & Token Payout:** Gives the company a perfect SHS (100) and low fraud (10), executes `processClaim(0)`, and asserts the `ClaimProcessed` event and the final `cyberToken.balanceOf(company)` equates exactly to the requested 1,000 CIT.
3. **Access Control & Security Reverts:** Verifies that an `unauthorizedUser` calling `recordFraudScore` throws a revert identical to the `onlyBackend` string: *"Only backend can record AI scores"*.

---

## 6. DEPLOYMENT & SEEDING ARCHITECTURE

To bootstrap the network and present the UI effectively, three hardhat scripts are explicitly defined in the `scripts/` directory:
1. **`deploy.js`:** Deploys `CyberToken` (minting 1,000,000 CIT), `PostureRegistry`, `PolicyEngine`, `AuditRegistry`, and `ClaimsProcessor`. It automatically transfers 50,000 CIT into the `ClaimsProcessor` to grant it standalone liquidity for automated payouts. Finally, it outputs a `deployed_addresses.json` mapping for the React frontend and Python backend to consume.
2. **`setup-policy.js`:** Seeds the `PolicyEngine` with mandatory requirements (e.g., Firewall, Off-site Backups) and registers a 100-score `PostureSnapshot` to simulate a fully compliant test-case company.
3. **`seed-audit-data.js`:** Generates 25 mock AI security actions in the `AuditRegistry` to pre-populate the "Live Network" and "Audit Trail" frontend pages with visual data immediately upon boot.

---

## 7. PROJECT DOCUMENTATION SUITE

The repository maintains an extensive supplemental documentation folder (`docs/`) to support the academic submission:
- **`Gas_Forensics_Report.md`**: An exhaustive breakdown of the gas optimization strategies utilized, specifically focusing on the translation from storage to immutable state variables in `PolicyEngine.sol` and `ClaimsProcessor.sol`.
- **`UI_Test_Scenarios.md`**: A structured walkthrough guide for presenters, detailing step-by-step UI flows (Client interactions vs Admin approvals).
- **`index.md`**: A high-level overview generated dynamically via `generate_docs.py` using `solidity-docgen`, which maps the NatSpec comments into a navigable HTML/Markdown structure.
