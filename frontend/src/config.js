import { ethers } from 'ethers';

// ── Contract Addresses (from deployed_addresses.json) ──────────────────
export const ADDRESSES = {
  CyberToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  AuditRegistry: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  Governance: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  PostureRegistry: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  PolicyEngine: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  ClaimsProcessor: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  DailyReportRegistry: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"
};

// ── ABI Fragments (Human-Readable for Ethers v6) ───────────────────────
export const ABIS = {
  CyberToken: [
    "function balanceOf(address account) view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function symbol() view returns (string)"
  ],
  ClaimsProcessor: [
    "function fileClaim(uint256 breachTimestamp, string attackType, uint256 claimedAmount) public returns (uint256)",
    "function claimCount() view returns (uint256)",
    "function getClaim(uint256) view returns (tuple(address company, uint256 breachTimestamp, string attackType, uint256 claimedAmount, uint8 verdict, uint8 payoutPercentage, uint8 fraudScore, bytes32 fraudReportHash, uint256 processedAt))",
    "function recordFraudScore(uint256 claimId, uint8 fraudScore, bytes32 reportHash) external",
    "function processClaim(uint256 claimId) external",
    "event ClaimFiled(uint256 indexed claimId, address indexed company, uint256 amount)",
    "event ClaimProcessed(uint256 indexed claimId, uint8 verdict, uint256 payoutAmount)",
    "event FraudScoreRecorded(uint256 indexed claimId, uint8 fraudScore)"
  ],
  PolicyEngine: [
    "function setPolicy(address company, string[] ruleNames, bool[] requiredFlags, uint256[] maxAgeSeconds, uint8[] weights) external",
    "function getPolicy(address company) view returns (tuple(string ruleName, bool required, uint256 maxAgeSeconds, uint8 weight)[])",
    "function isPolicyActive(address company) view returns (bool)",
    "function insurer() view returns (address)"
  ],
  PostureRegistry: [
    "function getLastSnapshot(address company) view returns (tuple(bytes32 merkleRoot, uint256 timestamp, address company, uint8 complianceScore))",
    "function getSnapshotCount(address company) view returns (uint256)",
    "function getSecurityHygieneScore(address company) view returns (uint8)",
    "function getSnapshotByIndex(address company, uint256 index) view returns (tuple(bytes32 merkleRoot, uint256 timestamp, address company, uint8 complianceScore))"
  ],
  AuditRegistry: [
    "function getEntryCount() view returns (uint256)",
    "function getEntry(uint256 id) view returns (tuple(bytes32 instructionHash, bytes32 contextHash, bytes32 reasoningHash, bytes32 actionHash, uint8 riskLevel, uint256 timestamp))",
    "event ActionLogged(uint256 indexed id, bytes32 actionHash, uint8 risk)"
  ],
  Governance: [
    "function requestApproval(uint256 entryId) external",
    "function approve(uint256 entryId) external",
    "function reject(uint256 entryId) external",
    "function isPending(uint256 entryId) view returns (bool)",
    "function isApproved(uint256 entryId) view returns (bool)",
    "event ApprovalRequested(uint256 indexed entryId)",
    "event ActionApproved(uint256 indexed entryId, address indexed approver)",
    "event ActionRejected(uint256 indexed entryId, address indexed rejector)"
  ],
  DailyReportRegistry: [
    "function currentDay() view returns (uint256)",
    "function getReport(uint256 day) view returns (tuple(bytes32 reportHash, uint256 timestamp, uint256 totalActions, uint8 avgRiskLevel, bool submitted))",
    "event DailyReportSubmitted(uint256 indexed day, bytes32 reportHash, uint256 totalActions)"
  ]
};

export const ADMIN_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// ── Helper: Get contract instance ──────────────────────────────────────
export function getContract(name, providerOrSigner) {
  return new ethers.Contract(ADDRESSES[name], ABIS[name], providerOrSigner);
}

// ── Helper: Truncate address ───────────────────────────────────────────
export function truncAddr(addr) {
  if (!addr) return "";
  return addr.substring(0, 6) + "..." + addr.substring(38);
}

// ── Helper: Truncate bytes32 hash ──────────────────────────────────────
export function truncHash(hash) {
  if (!hash || hash === ethers.ZeroHash) return "—";
  return hash.substring(0, 10) + "..." + hash.substring(58);
}

// ── Helper: Format CIT tokens ──────────────────────────────────────────
export function formatCIT(val) {
  return parseFloat(ethers.formatUnits(val, 18)).toLocaleString();
}

// ── Helper: Format timestamp ───────────────────────────────────────────
export function formatTime(ts) {
  const n = Number(ts);
  if (n === 0) return "—";
  return new Date(n * 1000).toLocaleString();
}
