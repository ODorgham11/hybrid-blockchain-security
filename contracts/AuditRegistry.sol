// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AuditRegistry
/// @notice Immutable log for AI Security Agent decisions and actions.
contract AuditRegistry {

    enum RiskLevel { LOW, MEDIUM, HIGH, CRITICAL }

    struct AuditEntry {
        bytes32 instructionHash;
        bytes32 contextHash;
        bytes32 reasoningHash;
        bytes32 actionHash;
        RiskLevel riskLevel;
        uint256 timestamp;
    }

    /// @notice Array of all recorded AI reasoning logs.
    AuditEntry[] public entries;
    
    /// @notice The contract deployer and administrator.
    address public owner;

    /// @notice Emitted when a new AI action is successfully logged.
    /// @param id The unique identifier of the log entry.
    /// @param actionHash The SHA256 hash of the specific action taken.
    /// @param risk The assigned risk level of the action.
    event ActionLogged(uint256 indexed id, bytes32 actionHash, RiskLevel risk);

    /// @notice Initializes the AuditRegistry and sets the deployer as owner.
    constructor() {
        owner = msg.sender;
    }

    /// @notice Logs a new AI decision to the blockchain.
    /// @dev Appends a new AuditEntry to the entries array and emits an ActionLogged event.
    /// @param _instruction The hash of the initial system instruction.
    /// @param _context The hash of the system state context at the time of action.
    /// @param _reasoning The hash of the AI's internal reasoning process.
    /// @param _action The hash of the specific action executed.
    /// @param _risk The enumerated RiskLevel determined by the AI.
    /// @return entryId The array index of the newly created log entry.
    function logAction(
        bytes32 _instruction,
        bytes32 _context,
        bytes32 _reasoning,
        bytes32 _action,
        RiskLevel _risk
    ) external returns (uint256 entryId) {
        entryId = entries.length;
        entries.push(AuditEntry({
            instructionHash: _instruction,
            contextHash: _context,
            reasoningHash: _reasoning,
            actionHash: _action,
            riskLevel: _risk,
            timestamp: block.timestamp
        }));

        emit ActionLogged(entryId, _action, _risk);
    }

    /// @notice Count AI actions logged within a specific time window.
    /// @param startTimestamp The beginning of the time range (Unix timestamp).
    /// @param endTimestamp The end of the time range (Unix timestamp).
    /// @return count The number of actions recorded in that period.
    function getActionCountByTimeRange(uint256 startTimestamp, uint256 endTimestamp) 
        external 
        view 
        returns (uint256 count) 
    {
        for (uint256 i = 0; i < entries.length; i++) {
            if (entries[i].timestamp >= startTimestamp && entries[i].timestamp <= endTimestamp) {
                count++;
            }
        }
    }

    /// @notice Retrieves the total number of recorded AI actions.
    /// @dev Useful for external iteration over the entries array.
    /// @return The total count of AuditEntry items stored.
    function getEntryCount() external view returns (uint256) {
        return entries.length;
    }

    /// @notice Retrieves a specific AI action log by its ID.
    /// @dev Reverts if the requested ID is out of bounds.
    /// @param _id The index of the AuditEntry to retrieve.
    /// @return The full AuditEntry struct corresponding to the ID.
    function getEntry(uint256 _id) external view returns (AuditEntry memory) {
        require(_id < entries.length, "Invalid ID");
        return entries[_id];
    }
}