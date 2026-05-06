// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AuditRegistry
/// @notice Immutable on-chain log of every AI agent decision.
contract AuditRegistry {

    // ── Enums ──────────────────────────────────────────────────────────────
    enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

    // ── Structs ────────────────────────────────────────────────────────────
    struct AuditEntry {
        bytes32 instructionHash; // SHA-256 of the task sent to the agent
        bytes32 contextHash;     // SHA-256 of retrieved context / memory
        bytes32 reasoningHash;   // SHA-256 of agent chain-of-thought
        bytes32 actionHash;      // SHA-256 of the action to be executed
        bytes32 resultHash;      // SHA-256 of execution result (set later)
        RiskLevel riskLevel;
        uint256 timestamp;
        address submitter;
        bool resultLogged;
    }

    // ── State ──────────────────────────────────────────────────────────────
    mapping(uint256 => AuditEntry) private entries;
    uint256 public entryCount;

    mapping(uint256 => bytes32) public batchRoots;
    uint256 public batchCount;

    // ── Events ─────────────────────────────────────────────────────────────
    event ActionLogged(uint256 indexed entryId, RiskLevel riskLevel, address submitter);
    event ResultLogged(uint256 indexed entryId, bytes32 resultHash);
    event BatchLogged(uint256 indexed batchId, bytes32 merkleRoot, uint256 timestamp);

    // ── Write Functions ────────────────────────────────────────────────────

    /// @notice Log a batch of AI decisions via Merkle root.
    function recordBatchRoot(bytes32 _merkleRoot) external returns (uint256 batchId) {
        batchId = batchCount++;
        batchRoots[batchId] = _merkleRoot;
        emit BatchLogged(batchId, _merkleRoot, block.timestamp);
    }

    /// @notice Log an AI decision before it executes. Returns the entry ID.
    function logAction(
        bytes32 _instructionHash,
        bytes32 _contextHash,
        bytes32 _reasoningHash,
        bytes32 _actionHash,
        uint8   _riskLevel
    ) external returns (uint256 entryId) {
        require(_riskLevel <= 3, "Invalid risk level");

        entryId = entryCount++;
        entries[entryId] = AuditEntry({
            instructionHash: _instructionHash,
            contextHash:     _contextHash,
            reasoningHash:   _reasoningHash,
            actionHash:      _actionHash,
            resultHash:      bytes32(0),
            riskLevel:       RiskLevel(_riskLevel),
            timestamp:       block.timestamp,
            submitter:       msg.sender,
            resultLogged:    false
        });

        emit ActionLogged(entryId, RiskLevel(_riskLevel), msg.sender);
    }

    /// @notice Log the result after the action executes.
    function logResult(uint256 _entryId, bytes32 _resultHash) external {
        require(_entryId < entryCount, "Entry does not exist");
        require(!entries[_entryId].resultLogged, "Result already logged");

        entries[_entryId].resultHash   = _resultHash;
        entries[_entryId].resultLogged = true;

        emit ResultLogged(_entryId, _resultHash);
    }

    // ── Read Functions ─────────────────────────────────────────────────────

    /// @notice Get a full audit entry by ID.
    function getEntry(uint256 _entryId) external view returns (AuditEntry memory) {
        require(_entryId < entryCount, "Entry does not exist");
        return entries[_entryId];
    }

    /// @notice Verify that a given hash matches the stored actionHash for an entry.
    function verifyActionHash(uint256 _entryId, bytes32 _hash) external view returns (bool) {
        require(_entryId < entryCount, "Entry does not exist");
        return entries[_entryId].actionHash == _hash;
    }
}
