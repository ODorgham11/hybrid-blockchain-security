# Aegis OS — Complete UI Test Scenarios (Updated)

> **Prerequisites before testing:**
> - Terminal 1: `npx hardhat node`
> - Terminal 2: `npx hardhat run scripts/deploy.js --network localhost`
> - Terminal 2: `npx hardhat run scripts/setup-policy.js --network localhost`
> - Terminal 2: `npx hardhat run scripts/seed-audit-data.js --network localhost` ← seeds Phase 5, 6
> - Terminal 3: `cd backend && uvicorn main:app --reload --workers 1` ← needed for Phase 11, 12, 13
> - Terminal 4: `cd frontend && npm run dev`
> - MetaMask: Chain ID 1337, Account #0 (Admin), Account #1 (Client)

---

## PHASE 1 — Login & Authentication

### Test 1.1 — Invalid Email
1. Open http://localhost:5173
2. Type `notanemail` (no @) → Click "Send 2FA Code"
**Expected**: Alert "Please enter a valid email address"

### Test 1.2 — Wrong 2FA Code
1. Enter valid email → "Send 2FA Code" → Enter `000000`
**Expected**: Alert "Invalid 2FA code. Hint: 123456"

### Test 1.3 — Admin Login (Account #0)
1. Email → Code `123456` → Verify → MetaMask Account #0 → Connect
**Expected**: **Insurer Console** with 6 sidebar items (including Activity Feed)

### Test 1.4 — Client Login (Account #1)
1. Same steps but Account #1
**Expected**: **Company Portal** with 4 sidebar items (including Activity Feed)

### Test 1.5 — Account Switch Auto-Reload
1. While logged in, switch MetaMask account
**Expected**: Page reloads automatically

---

## PHASE 2 — Admin Dashboard (View #1)

### Test 2.1 — Stats Cards Load
**Expected**: 4 stat cards — Total Claims: 0, Pending: 0, CIT Liquidity: 50,000, AI Actions: 0

### Test 2.2 — Empty Recent Claims
**Expected**: "No claims have been filed yet" message

### Test 2.3 — Live Data Polling
1. File a claim from Client → watch Admin Dashboard without refreshing
**Expected**: Counts update within 5 seconds

---

## PHASE 3 — Policy Manager (Admin View #2)

### Test 3.1 — Deploy a Policy
1. Admin → Policy Manager → Company: `0x70997970...` → Click "Deploy Policy On-Chain"
**Expected**: "⏳ Deploying..." → green TxHash success banner

### Test 3.2 — Add/Remove Rules
1. Click "+ Add Rule" → fill in → remove a rule → Deploy
**Expected**: Flexible rules persist on-chain

### Test 3.3 — Lookup Active Policy
1. Enter company address → Lookup
**Expected**: Green ACTIVE badge + rule table

### Test 3.4 — Lookup No Policy
1. Enter random address → Lookup
**Expected**: Red INACTIVE badge + "No policy rules found"

---

## PHASE 4 — Claims Admin (Admin View #3)

### Test 4.1 — Empty Table
**Expected**: Empty state icon + "No claims have been filed yet"

### Test 4.2 — Claims Appear After Filing (Client)
1. Switch to Client → File a claim → back to Admin → Claims Admin
**Expected**: New row with yellow PENDING badge + "Score & Process" button

### Test 4.3 — Process Claim (Happy Path)
1. Click "⚡ Score & Process" → Approve MetaMask
**Expected**: Button shows "⏳ Processing..." → row updates to APPROVED

### Test 4.4 — Already Processed Error
1. Click "Score & Process" on an already-approved claim
**Expected**: Red error: "Claim already processed"

### Test 4.5 — View Analysis Drawer (requires FastAPI running)
1. On a processed claim, click "📋 View Analysis"
**Expected**: Drawer expands showing:
   - Fraud Score (color-coded: green < 30, yellow < 75, red ≥ 75)
   - Recommendation badge (APPROVE / PARTIAL / DENY)
   - Full AI reasoning paragraph

### Test 4.6 — Toggle Analysis Drawer
1. Click "📋 View Analysis" → drawer opens → click "▲ Hide"
**Expected**: Drawer collapses

### Test 4.7 — Analysis Not Found (no FastAPI)
1. Click "📋 View Analysis" with backend offline
**Expected**: Red error "No analysis found — run the backend FraudAnalyzer"

---

## PHASE 5 — Audit Trail (Admin View #4)

### Test 5.1 — Empty (before seeding)
**Expected**: "No AI actions have been logged yet" message

### Test 5.2 — Entries Appear After Seeding
1. Run `npx hardhat run scripts/seed-audit-data.js --network localhost`
2. Reload Audit Trail
**Expected**: 5 entries with correct risk badges: LOW, MEDIUM, HIGH×2, CRITICAL

### Test 5.3 — Auto-Approved for LOW/MEDIUM
**Expected**: Entries #0 and #1 show "Auto-approved" text, no buttons

### Test 5.4 — Governance Buttons for HIGH/CRITICAL
**Expected**: Entries #2, #3, #4 show "📋 Request Approval" button

### Test 5.5 — Request → Approve Flow
1. Click "Request Approval" on Entry #2 → MetaMask → confirm
2. Buttons change to "✓ Approve" and "✕ Reject"
3. Click "✓ Approve" → MetaMask → confirm
**Expected**: Green APPROVED badge, buttons gone

### Test 5.6 — Reject Flow
1. Request approval on Entry #3 → then "✕ Reject"
**Expected**: Back to "Request Approval" state

---

## PHASE 6 — Chain Explorer (Admin View #5)

### Test 6.1 — Backend Status Indicator (Panel A)
- FastAPI running → green dot "Live DB Data"
- FastAPI stopped → red dot "Backend Offline"

### Test 6.2 — Panel A: Real Reasoning Text (FastAPI running + seeded)
1. Run `seed-audit-data.js` → start FastAPI → open Chain Explorer
**Expected**: Each entry shows real JSON from DB:
   - `agent`, `action`, `risk`, `reasoning` (first 120 chars)
   - "✅ Hash Verified — DB Record Matches On-Chain"

### Test 6.3 — Panel A: Fallback When Backend Offline
**Expected**: Right side shows "Start FastAPI backend to see real AI reasoning text here."

### Test 6.4 — Panel B: Daily Reports (after seeding)
**Expected**: 3 rows (Day 0, Day 1, Day 2) with hashes, action counts, Anchored ✅ badge

### Test 6.5 — Panel C: Posture Lookup
1. Click "Verify" with default address (after running setup-policy.js)
**Expected**: Split card showing on-chain Merkle root + off-chain posture breakdown

### Test 6.6 — Panel C: No Snapshots
1. Enter fresh address → Verify
**Expected**: "No posture snapshots found for this address"

---

## PHASE 7 — Client Dashboard (Client View #1)

### Test 7.1 — Stats Load
**Expected**: CIT Balance, SHS donut, Policy Status, Claims counters

### Test 7.2 — SHS Color Coding
| Score | Color |
|-------|-------|
| ≥ 90 | 🟢 Green |
| 50-89 | 🟡 Yellow |
| < 50  | 🔴 Red |

### Test 7.3 — CIT Balance Updates After Payout
1. Admin processes client's claim → Client Dashboard polls
**Expected**: Balance increases within 5 seconds

---

## PHASE 8 — File Claim (Client View #2)

### Test 8.1 — No Policy Error
1. Login as Account with no policy → File Claim
**Expected**: Red error banner: "No active policy" or contract revert

### Test 8.2 — Happy Path
1. Account #1 (policy active) → Ransomware, 1000 CIT → Submit
**Expected**: ⏳ → Green tx banner + "What happens next?" info box

### Test 8.3 — All Attack Types
Test: Ransomware, DDoS Attack, Data Breach, Phishing, Supply Chain
**Expected**: All file successfully, correct label in My Claims

### Test 8.4 — Large Amount
**Expected**: Transaction succeeds (no on-chain cap on claimed amount)

---

## PHASE 9 — My Claims (Client View #3)

### Test 9.1 — Empty State
**Expected**: "You haven't filed any claims yet" + "File Your First Claim" button

### Test 9.2 — Claims Appear
**Expected**: Rows with PENDING badge, correct attack type + amount

### Test 9.3 — Verdict Updates After Processing
**Expected**: PENDING → APPROVED/PARTIAL/DENIED within 5s (live polling)

### Test 9.4 — Filtered by Wallet
**Expected**: Only claims filed by the connected wallet are visible

---

## PHASE 10 — MetaMask Edge Cases

### Test 10.1 — Wrong Network
**Expected**: Transaction fails with network mismatch in red TxFeedback

### Test 10.2 — No MetaMask
**Expected**: Alert "Please install MetaMask!"

### Test 10.3 — Node Goes Down Mid-Session
**Expected**: Console errors caught, UI shows last known data, no crash

---

## PHASE 11 — Activity Feed Admin (Admin View #6) ⭐ NEW

### Test 11.1 — Backend Offline State
1. Open Admin → Activity Feed with FastAPI stopped
**Expected**: Red status dot + "Backend Offline" message + `uvicorn` command hint

### Test 11.2 — Backend Online, Empty DB
1. Start FastAPI → Activity Feed
**Expected**: Green "Backend Connected" dot + "No actions recorded yet" empty state

### Test 11.3 — Actions Appear After API Calls (FastAPI running)
1. POST to `http://localhost:8000/api/analyze-alert` with:
```json
{ "alert": "Brute force on SSH port 22 from 10.0.0.5", "context": "3 attempts in 60 seconds" }
```
2. Refresh Activity Feed
**Expected**: New row appears:
   - 🚫 or 🔥 icon (IP_BLOCK or FIREWALL_BLOCK)
   - Description: e.g., "IP 10.0.0.5 blocked"
   - Triggered by: SecurityAgent
   - AI reasoning preview (first 100 chars)

### Test 11.4 — Filter: ALL
**Expected**: All action types visible (FIREWALL_BLOCK, IP_BLOCK, POLICY_CHECK, NOTARIZATION, etc.)

### Test 11.5 — Filter: SECURITY
**Expected**: Only FIREWALL_BLOCK, IP_BLOCK, QUARANTINE, PATCH_FLAG, ALERT_ESCALATION rows

### Test 11.6 — Filter: FRAUD
**Expected**: Only POLICY_CHECK rows (FraudAnalyzer actions)

### Test 11.7 — Filter: NOTARIZATION
**Expected**: Only NOTARIZATION rows from Notarizer batch commits

### Test 11.8 — Live Polling
1. POST another alert → watch without refreshing
**Expected**: New row appears at top within 5 seconds

### Test 11.9 — Event Counter Updates
**Expected**: "X events" counter in top-right updates with active filter

---

## PHASE 12 — Activity Feed Client (Client View #4) ⭐ NEW

### Test 12.1 — Offline State
**Expected**: Red dot + "Backend is offline" message

### Test 12.2 — Shows Only Claim-Related Events
1. File a claim → Admin uses `/api/analyze-claim` to process it
2. Client → Activity Feed
**Expected**: Only POLICY_CHECK and NOTARIZATION rows visible (no FIREWALL_BLOCK etc.)

### Test 12.3 — AI Reasoning Previews
**Expected**: Each POLICY_CHECK row shows full AI fraud analysis excerpt (up to 200 chars)

---

## PHASE 13 — SQLite Database Verification

### Test 13.1 — DB Created On FastAPI Start
1. Start FastAPI → check `backend/aegis.db` exists
**Expected**: File appears (it's excluded from git)

### Test 13.2 — DB Persists After Hardhat Restart
1. Stop Hardhat node → restart it → check FastAPI Activity Feed
**Expected**: Old DB entries still visible (DB is independent of chain state)

### Test 13.3 — Verify via SQLite CLI
```bash
cd backend
python -c "import sqlite3; conn=sqlite3.connect('aegis.db'); print(conn.execute('SELECT * FROM system_actions').fetchall())"
```
**Expected**: Returns rows matching what's shown in the UI

### Test 13.4 — All 5 Endpoints Work
```
GET http://localhost:8000/api/activity-feed   → list of actions
GET http://localhost:8000/api/ai-decisions    → list of decisions
GET http://localhost:8000/api/claim-analysis/0 → claim 0 analysis
GET http://localhost:8000/api/alerts          → security alerts list
GET http://localhost:8000/api/system-stats    → total_actions count
```

---

## PHASE 14 — Threat Simulator (Admin View #7) ⭐ NEW

### Test 14.1 — Launch Predefined Attack
1. Admin → Threat Simulator → Select "Ransomware Payload" → Click "Launch"
2. **Expected**: Button shows "⏳ Analyzing..." → After ~40s, red box appears with Risk Level 3 and "ISOLATE HOST" action.

### Test 14.2 — Background Persistence
1. Click "Launch" on an attack → Immediately navigate to "Dashboard"
2. Wait 1 minute → Navigate back to "Threat Simulator"
**Expected**: The AI response is visible exactly as it finished (state was not lost).

### Test 14.3 — Smart Contract Vulnerability
1. Select "Smart Contract" tab → "Reentrancy Attack" → Launch
**Expected**: Risk Level: 3 → Action: PAUSE CONTRACT → Notarization ID generated.

---

## PHASE 15 — Database Viewer (Admin View #8) ⭐ NEW

### Test 15.1 — Full DB Visibility
1. Admin → DB Viewer
**Expected**: Table displays every action recorded in `aegis.db`.

---

## PHASE 16 — Live Chain Stream (Admin View #9) ⭐ NEW

### Test 16.1 — WebSocket Connection
**Expected**: Top-right badge shows green "WSS CONNECTED".

### Test 16.2 — Real-time Terminal Stream
1. Open Live Network in one window → Trigger attack in Simulator
**Expected**: Matrix-style text appears instantly reflecting the on-chain event.

---

## QUICK COMMAND REFERENCE

```bash
# Start everything
npx hardhat node                                                    # Terminal 1
npx hardhat run scripts/deploy.js --network localhost               # Terminal 2
npx hardhat run scripts/setup-policy.js --network localhost         # Terminal 2
npx hardhat run scripts/seed-audit-data.js --network localhost      # Terminal 2
cd backend && uvicorn main:app --reload --workers 1                 # Terminal 3
cd frontend && npm run dev                                          # Terminal 4

# Verify Blockchain Connection
python -c "import sys; sys.path.append('backend'); import blockchain; blockchain.init_blockchain(); print('Entries:', blockchain.audit_registry.functions.getEntryCount().call())"
```

---

## DEMO ORDER (For Doctor — ~10 minutes)

1. **Login as Admin** → Show role-based auth and 9-page sidebar.
2. **Threat Simulator** → Launch "Ransomware" (explain AI analysis delay).
3. **Navigate Freely** → Go to Dashboard/Policies while AI works (show persistence).
4. **Live Chain Stream** → Watch the Matrix stream catch the event in real-time.
5. **Chain Explorer** → Show the immutable anchor (Hash match).
6. **DB Viewer** → Show full off-chain database transparency.
7. **Audit Trail** → Governance flow (Request/Approve).
8. **Switch to Client** → File a claim (show user experience).
9. **Back to Admin** → Claims Admin → Score & Process (automated fraud scoring).
10. **Activity Feed** → Summary of everything that happened in the session.

