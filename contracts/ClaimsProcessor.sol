// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ── Interfaces ─────────────────────────────────────────────────────────
// Using interfaces decouples the contracts and prevents "Identifier not found" errors.

interface IPostureRegistry {
    function getSecurityHygieneScore(address _company) external view returns (uint8);
}

interface IPolicyEngine {
    function isPolicyActive(address _company) external view returns (bool);
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

    IPostureRegistry public immutable postureRegistry;
    IPolicyEngine public immutable policyEngine;
    IERC20 public immutable cyberToken; // The ERC20 Asset
    
    mapping(uint256 => Claim) private claims;
    uint256 public claimCount;

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
    constructor(address _postureRegistryAddress, address _policyEngineAddress, address _cyberTokenAddress) {
        postureRegistry = IPostureRegistry(_postureRegistryAddress);
        policyEngine = IPolicyEngine(_policyEngineAddress);
        cyberToken = IERC20(_cyberTokenAddress);
        backendSystem = msg.sender; 
    }

    /// @notice Allows a company to file a new cyber insurance claim.
    /// @param _breachTimestamp The epoch time the breach occurred.
    /// @param _attackType Description of the vector (e.g., "Ransomware").
    /// @param _claimedAmount The amount of CIT tokens requested.
    /// @return claimId The unique identifier for the newly filed claim.
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
    /// @param _claimId The ID of the claim to update.
    /// @param _fraudScore The risk score (0-100) determined by the AI Agent.
    /// @param _reportHash The SHA-256 hash of the off-chain reasoning report.
    function recordFraudScore(uint256 _claimId, uint8 _fraudScore, bytes32 _reportHash) external onlyBackend {
        require(_claimId < claimCount, "Claim does not exist");
        require(claims[_claimId].verdict == Verdict.PENDING, "Claim already processed");

        claims[_claimId].fraudScore = _fraudScore;
        claims[_claimId].fraudReportHash = _reportHash;

        emit FraudScoreRecorded(_claimId, _fraudScore);
    }

    /// @notice Processes the claim, determines the verdict, and executes token transfers.
    /// @dev Implements the Checks-Effects-Interactions (CEI) pattern to prevent reentrancy.
    /// @param _claimId The ID of the claim to adjudicate.
    function processClaim(uint256 _claimId) external onlyBackend nonReentrant {
        // 1. CHECKS
        require(_claimId < claimCount, "Claim does not exist");
        Claim storage claim = claims[_claimId];
        require(claim.verdict == Verdict.PENDING, "Claim already processed");
        require(claim.fraudReportHash != bytes32(0), "AI Fraud score must be recorded first");
        
        uint8 shs = postureRegistry.getSecurityHygieneScore(claim.company);
        uint8 aiFraudRisk = claim.fraudScore;
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

    /// @notice Retrieves the full data of a claim.
    /// @param _claimId The ID of the claim to fetch.
    /// @return A Claim struct containing all recorded data.
    function getClaim(uint256 _claimId) external view returns (Claim memory) {
        require(_claimId < claimCount, "Claim does not exist");
        return claims[_claimId];
    }
}