// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ── Interfaces ─────────────────────────────────────────────────────────

interface IPostureRegistry {
    function getSecurityHygieneScore(address _company) external view returns (uint8);
}

interface IPolicyEngine {
    function isPolicyActive(address _company) external view returns (bool);
}

interface IAuditRegistry {
    function getActionCountByTimeRange(uint256 startTimestamp, uint256 endTimestamp) external view returns (uint256);
}

// ── Contract ───────────────────────────────────────────────────────────

/// @title ClaimsProcessor
/// @notice Automated judge that processes cyber insurance claims and executes ERC20 payouts.
/// @dev Integrates ReentrancyGuard for CEI pattern compliance and NatSpec for documentation.
contract ClaimsProcessor is ReentrancyGuard {

    enum Verdict { PENDING, APPROVED, PARTIAL, DENIED }

    struct Claim {
        address company;
        uint256 breachTimestamp;
        string attackType;
        uint256 claimedAmount;
        Verdict verdict;
        uint8 payoutPercentage;  // 0-100
        uint8 fraudScore;        // Provided by AI Fraud Analyzer (0-100)
        bytes32 fraudReportHash; // SHA-256 of the AI Fraud Analyzer's text report
        uint256 processedAt;
    }

    /// @notice The immutable registry tracking daily company security postures.
    IPostureRegistry public immutable postureRegistry;
    
    /// @notice The immutable engine defining mandatory insurance coverage rules.
    IPolicyEngine public immutable policyEngine;
    
    /// @notice The immutable registry containing logs of AI defensive actions.
    IAuditRegistry public immutable auditRegistry;
    
    /// @notice The immutable ERC20 token used to disburse claim payouts.
    IERC20 public immutable cyberToken; // The ERC20 Asset
    
    mapping(uint256 => Claim) private claims;
    
    /// @notice A sequentially increasing counter tracking total submitted claims.
    uint256 public claimCount;

    /// @notice The designated off-chain Oracle or AI Backend allowed to submit fraud scores.
    address public backendSystem; 

    event ClaimFiled(uint256 indexed claimId, address indexed company, uint256 amount);
    event ClaimProcessed(uint256 indexed claimId, Verdict verdict, uint256 payoutAmount);
    event FraudScoreRecorded(uint256 indexed claimId, uint8 fraudScore);

    /// @notice Restricts access to the authorized AI backend system.
    modifier onlyBackend() {
        require(msg.sender == backendSystem, "Only backend can record AI scores");
        _;
    }

    /// @notice Initializes the contract with required dependencies.
    /// @param _postureRegistryAddress Address of the posture registry contract.
    /// @param _policyEngineAddress Address of the policy engine contract.
    /// @param _cyberTokenAddress Address of the ERC20 token used for payouts.
    /// @param _auditRegistryAddress Address of the audit registry for AI action verification.
    constructor(
        address _postureRegistryAddress, 
        address _policyEngineAddress, 
        address _cyberTokenAddress,
        address _auditRegistryAddress
    ) {
        postureRegistry = IPostureRegistry(_postureRegistryAddress);
        policyEngine = IPolicyEngine(_policyEngineAddress);
        cyberToken = IERC20(_cyberTokenAddress);
        auditRegistry = IAuditRegistry(_auditRegistryAddress);
        backendSystem = msg.sender; 
    }

    /// @notice Allows a company to file a new cyber insurance claim.
    /// @dev The sender must have an active policy in the PolicyEngine.
    /// @param _breachTimestamp The exact Unix timestamp when the security breach occurred.
    /// @param _attackType A descriptive string classifying the nature of the attack.
    /// @param _claimedAmount The total number of tokens requested by the victim.
    /// @return claimId The unique ID assigned to the newly filed claim.
    function fileClaim(
        uint256 _breachTimestamp,
        string calldata _attackType,
        uint256 _claimedAmount
    ) external nonReentrant returns (uint256 claimId) {
        require(policyEngine.isPolicyActive(msg.sender), "No active policy");

        claimId = claimCount++;
        claims[claimId] = Claim({
            company: msg.sender,
            breachTimestamp: _breachTimestamp,
            attackType: _attackType,
            claimedAmount: _claimedAmount,
            verdict: Verdict.PENDING,
            payoutPercentage: 0,
            fraudScore: 0,
            fraudReportHash: bytes32(0),
            processedAt: 0
        });

        emit ClaimFiled(claimId, msg.sender, _claimedAmount);
    }

    /// @notice Records the AI-generated fraud score for a pending claim.
    /// @dev Overwrites any previously empty fraud data and transitions the claim readiness.
    /// @param _claimId The unique ID of the claim being investigated.
    /// @param _fraudScore A risk integer from 0 (Safe) to 100 (Highly Fraudulent).
    /// @param _reportHash The SHA256 hash of the off-chain AI fraud reasoning document.
    /// @custom:security Protected by onlyBackend modifier.
    function recordFraudScore(uint256 _claimId, uint8 _fraudScore, bytes32 _reportHash) external onlyBackend {
        require(_claimId < claimCount, "Claim does not exist");
        require(claims[_claimId].verdict == Verdict.PENDING, "Claim already processed");

        claims[_claimId].fraudScore = _fraudScore;
        claims[_claimId].fraudReportHash = _reportHash;

        emit FraudScoreRecorded(_claimId, _fraudScore);
    }

    /// @notice Processes the claim, determines the verdict, and executes token transfers.
    /// @dev Implements the Checks-Effects-Interactions (CEI) pattern to prevent reentrancy.
    /// @param _claimId The unique ID of the claim to process.
    /// @custom:security Protected by nonReentrant and onlyBackend modifiers.
    function processClaim(uint256 _claimId) external onlyBackend nonReentrant {
        // 1. CHECKS
        require(_claimId < claimCount, "Claim does not exist");
        Claim storage claim = claims[_claimId];
        require(claim.verdict == Verdict.PENDING, "Claim already processed");
        require(claim.fraudReportHash != bytes32(0), "AI Fraud score must be recorded first");
        
        uint8 shs = postureRegistry.getSecurityHygieneScore(claim.company);
        uint8 aiFraudRisk = claim.fraudScore;
        
        // ── HYBRID LOGIC: AI Defensive Boost ───────────────────────────
        // Query AuditRegistry for AI actions in the 7 days before breach.
        uint256 startTime = claim.breachTimestamp > 7 days ? claim.breachTimestamp - 7 days : 0;
        uint256 aiActions = auditRegistry.getActionCountByTimeRange(startTime, claim.breachTimestamp);
        
        // If the AI agent was actively defending (>5 actions), boost compliance by 10%.
        if (aiActions > 5) {
            uint16 boostedSHS = uint16(shs) + 10;
            shs = boostedSHS > 100 ? 100 : uint8(boostedSHS);
        }
        // ───────────────────────────────────────────────────────────────

        uint256 payoutAmount = 0;

        // 2. EFFECTS
        if (aiFraudRisk > 75) {
            claim.verdict = Verdict.DENIED;
            claim.payoutPercentage = 0;
        } else if (shs >= 90 && aiFraudRisk < 30) {
            claim.verdict = Verdict.APPROVED;
            claim.payoutPercentage = 100;
            payoutAmount = claim.claimedAmount;
        } else if (shs >= 50) {
            claim.verdict = Verdict.PARTIAL;
            claim.payoutPercentage = shs; 
            payoutAmount = (claim.claimedAmount * shs) / 100;
        } else {
            claim.verdict = Verdict.DENIED;
            claim.payoutPercentage = 0;
        }

        claim.processedAt = block.timestamp;
        emit ClaimProcessed(_claimId, claim.verdict, payoutAmount);

        // 3. INTERACTIONS (Token Transfer)
        if (payoutAmount > 0) {
            require(cyberToken.balanceOf(address(this)) >= payoutAmount, "Insufficient contract liquidity");
            require(cyberToken.transfer(claim.company, payoutAmount), "Token transfer failed");
        }
    }

    /// @notice Retrieves the comprehensive details of a given claim.
    /// @dev Reverts if the requested claim ID does not exist.
    /// @param _claimId The specific ID of the claim to fetch.
    /// @return The complete Claim struct data.
    function getClaim(uint256 _claimId) external view returns (Claim memory) {
        require(_claimId < claimCount, "Claim does not exist");
        return claims[_claimId];
    }
}