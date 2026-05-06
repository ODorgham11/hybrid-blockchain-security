// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AuditRegistry.sol";

/// @title Governance Mechanism
/// @notice Handles human approval for HIGH and CRITICAL risk AI actions.
/// @dev Updated to use immutable state variables for gas optimization.
contract Governance {

    // ── State ──────────────────────────────────────────────────────────────
    address public immutable owner;
    AuditRegistry public immutable auditRegistry;

    mapping(address => bool) public authorizedSigners;
    mapping(uint256 => bool) public pendingApprovals;
    mapping(uint256 => bool) public approvedActions;

    // ── Events ─────────────────────────────────────────────────────────────
    event ApprovalRequested(uint256 indexed entryId);
    event ActionApproved(uint256 indexed entryId, address indexed approver);
    event ActionRejected(uint256 indexed entryId, address indexed rejector);
    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);

    // ── Modifiers ──────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlySigner() {
        require(authorizedSigners[msg.sender], "Not an authorized signer");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────
    /// @notice Sets the deployer as the immutable owner and links the AuditRegistry.
    constructor(address _auditRegistryAddress) {
        owner = msg.sender;
        authorizedSigners[msg.sender] = true; 
        auditRegistry = AuditRegistry(_auditRegistryAddress);
    }

    // ── Admin Functions ────────────────────────────────────────────────────
    
    /// @notice Adds a new authorized signer.
    /// @param _signer The address to authorize.
    function addSigner(address _signer) external onlyOwner {
        authorizedSigners[_signer] = true;
        emit SignerAdded(_signer);
    }

    /// @notice Removes an authorized signer.
    /// @param _signer The address to remove.
    function removeSigner(address _signer) external onlyOwner {
        require(_signer != owner, "Cannot remove owner");
        authorizedSigners[_signer] = false;
        emit SignerRemoved(_signer);
    }

    // ── Governance Logic ───────────────────────────────────────────────────

    /// @notice Request human approval for a specific audit entry.
    function requestApproval(uint256 _entryId) external {
        AuditRegistry.AuditEntry memory entry = auditRegistry.getEntry(_entryId);
        require(uint8(entry.riskLevel) >= 2, "Risk level does not require approval");
        require(!approvedActions[_entryId], "Already approved");
        require(!pendingApprovals[_entryId], "Approval already requested");

        pendingApprovals[_entryId] = true;
        emit ApprovalRequested(_entryId);
    }

    /// @notice Approve a pending AI action.
    function approve(uint256 _entryId) external onlySigner {
        require(pendingApprovals[_entryId], "No pending approval for this entry");
        pendingApprovals[_entryId] = false;
        approvedActions[_entryId] = true;
        emit ActionApproved(_entryId, msg.sender);
    }

    /// @notice Reject a pending AI action.
    function reject(uint256 _entryId) external onlySigner {
        require(pendingApprovals[_entryId], "No pending approval for this entry");
        pendingApprovals[_entryId] = false;
        emit ActionRejected(_entryId, msg.sender);
    }

    // ── View Functions ─────────────────────────────────────────────────────

    function isApproved(uint256 _entryId) external view returns (bool) {
        return approvedActions[_entryId];
    }

    function isPending(uint256 _entryId) external view returns (bool) {
        return pendingApprovals[_entryId];
    }
}