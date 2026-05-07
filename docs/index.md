# Solidity API

## AuditRegistry

Immutable log for AI Security Agent decisions and actions.

### RiskLevel

```solidity
enum RiskLevel {
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL
}
```

### AuditEntry

```solidity
struct AuditEntry {
  bytes32 instructionHash;
  bytes32 contextHash;
  bytes32 reasoningHash;
  bytes32 actionHash;
  enum AuditRegistry.RiskLevel riskLevel;
  uint256 timestamp;
}
```

### entries

```solidity
struct AuditRegistry.AuditEntry[] entries
```

Array of all recorded AI reasoning logs.

### owner

```solidity
address owner
```

The contract deployer and administrator.

### ActionLogged

```solidity
event ActionLogged(uint256 id, bytes32 actionHash, enum AuditRegistry.RiskLevel risk)
```

Emitted when a new AI action is successfully logged.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| id | uint256 | The unique identifier of the log entry. |
| actionHash | bytes32 | The SHA256 hash of the specific action taken. |
| risk | enum AuditRegistry.RiskLevel | The assigned risk level of the action. |

### constructor

```solidity
constructor() public
```

Initializes the AuditRegistry and sets the deployer as owner.

### logAction

```solidity
function logAction(bytes32 _instruction, bytes32 _context, bytes32 _reasoning, bytes32 _action, enum AuditRegistry.RiskLevel _risk) external returns (uint256 entryId)
```

Logs a new AI decision to the blockchain.

_Appends a new AuditEntry to the entries array and emits an ActionLogged event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _instruction | bytes32 | The hash of the initial system instruction. |
| _context | bytes32 | The hash of the system state context at the time of action. |
| _reasoning | bytes32 | The hash of the AI's internal reasoning process. |
| _action | bytes32 | The hash of the specific action executed. |
| _risk | enum AuditRegistry.RiskLevel | The enumerated RiskLevel determined by the AI. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| entryId | uint256 | The array index of the newly created log entry. |

### getActionCountByTimeRange

```solidity
function getActionCountByTimeRange(uint256 startTimestamp, uint256 endTimestamp) external view returns (uint256 count)
```

Count AI actions logged within a specific time window.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| startTimestamp | uint256 | The beginning of the time range (Unix timestamp). |
| endTimestamp | uint256 | The end of the time range (Unix timestamp). |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| count | uint256 | The number of actions recorded in that period. |

### getEntryCount

```solidity
function getEntryCount() external view returns (uint256)
```

Retrieves the total number of recorded AI actions.

_Useful for external iteration over the entries array._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total count of AuditEntry items stored. |

### getEntry

```solidity
function getEntry(uint256 _id) external view returns (struct AuditRegistry.AuditEntry)
```

Retrieves a specific AI action log by its ID.

_Reverts if the requested ID is out of bounds._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _id | uint256 | The index of the AuditEntry to retrieve. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct AuditRegistry.AuditEntry | The full AuditEntry struct corresponding to the ID. |

## IPostureRegistry

### getSecurityHygieneScore

```solidity
function getSecurityHygieneScore(address _company) external view returns (uint8)
```

## IPolicyEngine

### isPolicyActive

```solidity
function isPolicyActive(address _company) external view returns (bool)
```

## IAuditRegistry

### getActionCountByTimeRange

```solidity
function getActionCountByTimeRange(uint256 startTimestamp, uint256 endTimestamp) external view returns (uint256)
```

## ClaimsProcessor

Automated judge that processes cyber insurance claims and executes ERC20 payouts.

_Integrates ReentrancyGuard for CEI pattern compliance and NatSpec for documentation._

### Verdict

```solidity
enum Verdict {
  PENDING,
  APPROVED,
  PARTIAL,
  DENIED
}
```

### Claim

```solidity
struct Claim {
  address company;
  uint256 breachTimestamp;
  string attackType;
  uint256 claimedAmount;
  enum ClaimsProcessor.Verdict verdict;
  uint8 payoutPercentage;
  uint8 fraudScore;
  bytes32 fraudReportHash;
  uint256 processedAt;
}
```

### postureRegistry

```solidity
contract IPostureRegistry postureRegistry
```

The immutable registry tracking daily company security postures.

### policyEngine

```solidity
contract IPolicyEngine policyEngine
```

The immutable engine defining mandatory insurance coverage rules.

### auditRegistry

```solidity
contract IAuditRegistry auditRegistry
```

The immutable registry containing logs of AI defensive actions.

### cyberToken

```solidity
contract IERC20 cyberToken
```

The immutable ERC20 token used to disburse claim payouts.

### claimCount

```solidity
uint256 claimCount
```

A sequentially increasing counter tracking total submitted claims.

### backendSystem

```solidity
address backendSystem
```

The designated off-chain Oracle or AI Backend allowed to submit fraud scores.

### ClaimFiled

```solidity
event ClaimFiled(uint256 claimId, address company, uint256 amount)
```

### ClaimProcessed

```solidity
event ClaimProcessed(uint256 claimId, enum ClaimsProcessor.Verdict verdict, uint256 payoutAmount)
```

### FraudScoreRecorded

```solidity
event FraudScoreRecorded(uint256 claimId, uint8 fraudScore)
```

### onlyBackend

```solidity
modifier onlyBackend()
```

Restricts access to the authorized AI backend system.

### constructor

```solidity
constructor(address _postureRegistryAddress, address _policyEngineAddress, address _cyberTokenAddress, address _auditRegistryAddress) public
```

Initializes the contract with required dependencies.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _postureRegistryAddress | address | Address of the posture registry contract. |
| _policyEngineAddress | address | Address of the policy engine contract. |
| _cyberTokenAddress | address | Address of the ERC20 token used for payouts. |
| _auditRegistryAddress | address | Address of the audit registry for AI action verification. |

### fileClaim

```solidity
function fileClaim(uint256 _breachTimestamp, string _attackType, uint256 _claimedAmount) external returns (uint256 claimId)
```

Allows a company to file a new cyber insurance claim.

_The sender must have an active policy in the PolicyEngine._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _breachTimestamp | uint256 | The exact Unix timestamp when the security breach occurred. |
| _attackType | string | A descriptive string classifying the nature of the attack. |
| _claimedAmount | uint256 | The total number of tokens requested by the victim. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| claimId | uint256 | The unique ID assigned to the newly filed claim. |

### recordFraudScore

```solidity
function recordFraudScore(uint256 _claimId, uint8 _fraudScore, bytes32 _reportHash) external
```

Records the AI-generated fraud score for a pending claim.

_Overwrites any previously empty fraud data and transitions the claim readiness._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _claimId | uint256 | The unique ID of the claim being investigated. |
| _fraudScore | uint8 | A risk integer from 0 (Safe) to 100 (Highly Fraudulent). |
| _reportHash | bytes32 | The SHA256 hash of the off-chain AI fraud reasoning document. |

### processClaim

```solidity
function processClaim(uint256 _claimId) external
```

Processes the claim, determines the verdict, and executes token transfers.

_Implements the Checks-Effects-Interactions (CEI) pattern to prevent reentrancy._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _claimId | uint256 | The unique ID of the claim to process. |

### getClaim

```solidity
function getClaim(uint256 _claimId) external view returns (struct ClaimsProcessor.Claim)
```

Retrieves the comprehensive details of a given claim.

_Reverts if the requested claim ID does not exist._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _claimId | uint256 | The specific ID of the claim to fetch. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct ClaimsProcessor.Claim | The complete Claim struct data. |

## DailyReportRegistry

Stores daily summaries of AI actions and security posture on the blockchain.

### DailyReport

```solidity
struct DailyReport {
  bytes32 reportHash;
  uint256 timestamp;
  uint256 totalActions;
  uint8 avgRiskLevel;
  bool submitted;
}
```

### dailyReports

```solidity
mapping(uint256 => struct DailyReportRegistry.DailyReport) dailyReports
```

A mapping of the day index to its corresponding DailyReport.

### currentDay

```solidity
uint256 currentDay
```

An auto-incrementing integer representing the current tracking day.

### backendSystem

```solidity
address backendSystem
```

The centralized backend agent authorized to submit reports.

### DailyReportSubmitted

```solidity
event DailyReportSubmitted(uint256 day, bytes32 reportHash, uint256 totalActions)
```

### onlyBackend

```solidity
modifier onlyBackend()
```

Restricts access to only the authorized backend system.

### constructor

```solidity
constructor() public
```

Initializes the contract and sets the backend system to the deployer.

### submitDailyReport

```solidity
function submitDailyReport(bytes32 _reportHash, uint256 _totalActions, uint8 _avgRiskLevel) external
```

Submit a daily security report hash to the blockchain

_Only callable by the backend system address set in constructor_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _reportHash | bytes32 | SHA256 hash of the full JSON report stored off-chain |
| _totalActions | uint256 | Total number of AI actions recorded this day |
| _avgRiskLevel | uint8 | Average risk level from 0 (LOW) to 3 (CRITICAL) |

### getReport

```solidity
function getReport(uint256 _day) external view returns (struct DailyReportRegistry.DailyReport)
```

Retrieves a specific daily report

_Reverts if the requested day has not been submitted yet._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _day | uint256 | The day number of the report |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct DailyReportRegistry.DailyReport | The DailyReport struct containing all details for that day |

### getCurrentDay

```solidity
function getCurrentDay() external view returns (uint256)
```

Returns the current day index

_This index represents the day that will be assigned to the NEXT report._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The zero-indexed current day number |

## Governance

Handles human approval for HIGH and CRITICAL risk AI actions.

_Updated to use immutable state variables for gas optimization._

### owner

```solidity
address owner
```

The contract deployer and supreme administrator.

### auditRegistry

```solidity
contract AuditRegistry auditRegistry
```

The linked AuditRegistry contract for verifying AI actions.

### authorizedSigners

```solidity
mapping(address => bool) authorizedSigners
```

Mapping of addresses that have human oversight sign-off rights.

### pendingApprovals

```solidity
mapping(uint256 => bool) pendingApprovals
```

Tracks which AuditRegistry entry IDs are waiting for human approval.

### approvedActions

```solidity
mapping(uint256 => bool) approvedActions
```

Tracks which AuditRegistry entry IDs have been approved.

### ApprovalRequested

```solidity
event ApprovalRequested(uint256 entryId)
```

### ActionApproved

```solidity
event ActionApproved(uint256 entryId, address approver)
```

### ActionRejected

```solidity
event ActionRejected(uint256 entryId, address rejector)
```

### SignerAdded

```solidity
event SignerAdded(address signer)
```

### SignerRemoved

```solidity
event SignerRemoved(address signer)
```

### onlyOwner

```solidity
modifier onlyOwner()
```

### onlySigner

```solidity
modifier onlySigner()
```

### constructor

```solidity
constructor(address _auditRegistryAddress) public
```

Sets the deployer as the immutable owner and links the AuditRegistry.

### addSigner

```solidity
function addSigner(address _signer) external
```

Adds a new authorized signer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The address to authorize. |

### removeSigner

```solidity
function removeSigner(address _signer) external
```

Removes an authorized signer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _signer | address | The address to remove. |

### requestApproval

```solidity
function requestApproval(uint256 _entryId) external
```

Request human approval for a specific audit entry.

_Only applies to HIGH (2) and CRITICAL (3) risk actions._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _entryId | uint256 | The ID of the action in the AuditRegistry. |

### approve

```solidity
function approve(uint256 _entryId) external
```

Approve a pending AI action.

_Emits an ActionApproved event._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _entryId | uint256 | The ID of the action awaiting approval. |

### reject

```solidity
function reject(uint256 _entryId) external
```

Reject a pending AI action.

_Emits an ActionRejected event. The action remains unapproved._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _entryId | uint256 | The ID of the action awaiting approval. |

### isApproved

```solidity
function isApproved(uint256 _entryId) external view returns (bool)
```

Checks if an action has been approved.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _entryId | uint256 | The ID of the action. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the action is approved, false otherwise. |

### isPending

```solidity
function isPending(uint256 _entryId) external view returns (bool)
```

Checks if an action is currently waiting for approval.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _entryId | uint256 | The ID of the action. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if the action is pending, false otherwise. |

## MaliciousAttacker

### targetContract

```solidity
contract ClaimsProcessor targetContract
```

### attackClaimId

```solidity
uint256 attackClaimId
```

### deployTarget

```solidity
function deployTarget(address posture, address policy, address token) external
```

### recordFraudScore

```solidity
function recordFraudScore(uint256 _claimId, uint8 _score, bytes32 _hash) external
```

### attack

```solidity
function attack(uint256 _claimId) external
```

### fallback

```solidity
fallback() external
```

## PolicyEngine

Stores the insurer-defined coverage rules for each company.

_Uses immutable variables to optimize gas costs as required by the rubric._

### PolicyRule

```solidity
struct PolicyRule {
  string ruleName;
  bool required;
  uint256 maxAgeSeconds;
  uint8 weight;
}
```

### insurer

```solidity
address insurer
```

The immutable address of the overarching insurer executing policies.

### isPolicyActive

```solidity
mapping(address => bool) isPolicyActive
```

Indicates whether a company currently has an active, valid policy.

### PolicySet

```solidity
event PolicySet(address company, uint256 ruleCount)
```

### onlyInsurer

```solidity
modifier onlyInsurer()
```

### constructor

```solidity
constructor() public
```

Sets the deployer as the immutable insurer.

### setPolicy

```solidity
function setPolicy(address _company, string[] _ruleNames, bool[] _requiredFlags, uint256[] _maxAgeSeconds, uint8[] _weights) external
```

Defines the policy rules for a specific company.

_Overwrites any existing policy for the company._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _company | address | The address of the company being insured. |
| _ruleNames | string[] | Human-readable names for the security rules. |
| _requiredFlags | bool[] | Boolean flags indicating if the rule is mandatory. |
| _maxAgeSeconds | uint256[] | The maximum time allowed between security snapshots. |
| _weights | uint8[] | The percentage weight each rule contributes to the total SHS. |

### getPolicy

```solidity
function getPolicy(address _company) external view returns (struct PolicyEngine.PolicyRule[])
```

Retrieves the full policy for a company.

_Only returns the dynamic array of PolicyRule structs._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _company | address | The address of the company to query. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PolicyEngine.PolicyRule[] | An array of PolicyRule structs representing the company's full policy. |

## PostureRegistry

Stores daily cryptographic snapshots of the company's security posture.

### PostureSnapshot

```solidity
struct PostureSnapshot {
  bytes32 merkleRoot;
  uint256 timestamp;
  address company;
  uint8 complianceScore;
}
```

### SnapshotRecorded

```solidity
event SnapshotRecorded(address company, bytes32 merkleRoot, uint8 score)
```

### recordSnapshot

```solidity
function recordSnapshot(bytes32 _merkleRoot, uint8 _score) external
```

Records a new daily snapshot

_Appends a new PostureSnapshot to the company's historical array._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _merkleRoot | bytes32 | The root of the daily security reasoning/data logs. |
| _score | uint8 | The compliance score calculated for the day. |

### getLastSnapshot

```solidity
function getLastSnapshot(address _company) external view returns (struct PostureRegistry.PostureSnapshot)
```

Gets the most recent snapshot for a company

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _company | address | The address of the company to query. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PostureRegistry.PostureSnapshot | The latest PostureSnapshot recorded for the company. |

### getSnapshotCount

```solidity
function getSnapshotCount(address _company) external view returns (uint256)
```

Gets the total number of snapshots for a company

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _company | address | The address of the company to query. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total count of snapshots in history. |

### getSnapshotByIndex

```solidity
function getSnapshotByIndex(address _company, uint256 _index) external view returns (struct PostureRegistry.PostureSnapshot)
```

Gets a specific snapshot by index

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _company | address | The address of the company. |
| _index | uint256 | The zero-based index of the snapshot. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct PostureRegistry.PostureSnapshot | The requested PostureSnapshot. |

### getSecurityHygieneScore

```solidity
function getSecurityHygieneScore(address _company) external view returns (uint8)
```

Calculates the 90-day rolling Security Hygiene Score

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _company | address | The address of the company. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint8 | The averaged SHS score (0-100). |

## CyberToken

ERC20 Token used for paying out approved cyber insurance claims.

_Implements Choice A of the Asset Standards requirement._

### constructor

```solidity
constructor(uint256 initialSupply) public
```

Constructor mints initial supply to the deployer.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| initialSupply | uint256 | The amount of tokens to mint upon deployment. |

### mint

```solidity
function mint(address to, uint256 amount) external
```

Allows the owner to mint additional tokens if the reserve runs low.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| to | address | The address receiving the newly minted tokens. |
| amount | uint256 | The number of tokens to mint. |

