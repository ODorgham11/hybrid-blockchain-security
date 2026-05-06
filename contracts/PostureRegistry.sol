// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PostureRegistry
/// @notice Stores daily cryptographic snapshots of the company's security posture.
contract PostureRegistry {

    struct PostureSnapshot {
        bytes32 merkleRoot;       // Represents 4 hashes (firewall, backup, cves, admin)
        uint256 timestamp;
        address company;
        uint8 complianceScore;    // 0-100 score based on that day's data
    }

    // Mapping from company address to an array of their daily snapshots
    mapping(address => PostureSnapshot[]) private snapshots;

    event SnapshotRecorded(address indexed company, bytes32 merkleRoot, uint8 score);

    /// @notice Records a new daily snapshot
    /// @param _merkleRoot The root of the daily security reasoning/data logs.
    /// @param _score The compliance score calculated for the day.
    function recordSnapshot(bytes32 _merkleRoot, uint8 _score) external {
        require(_score <= 100, "Score must be 0-100");

        PostureSnapshot memory newSnapshot = PostureSnapshot({
            merkleRoot: _merkleRoot,
            timestamp: block.timestamp,
            company: msg.sender,
            complianceScore: _score
        });

        snapshots[msg.sender].push(newSnapshot);

        emit SnapshotRecorded(msg.sender, _merkleRoot, _score);
    }

    /// @notice Gets the most recent snapshot for a company
    /// @param _company The address of the company to query.
    /// @return The latest PostureSnapshot recorded for the company.
    function getLastSnapshot(address _company) external view returns (PostureSnapshot memory) {
        require(snapshots[_company].length > 0, "No snapshots found");
        return snapshots[_company][snapshots[_company].length - 1];
    }

    /// @notice Gets the total number of snapshots for a company
    /// @param _company The address of the company to query.
    /// @return The total count of snapshots in history.
    function getSnapshotCount(address _company) external view returns (uint256) {
        return snapshots[_company].length;
    }

    /// @notice Gets a specific snapshot by index
    /// @param _company The address of the company.
    /// @param _index The zero-based index of the snapshot.
    /// @return The requested PostureSnapshot.
    function getSnapshotByIndex(address _company, uint256 _index) external view returns (PostureSnapshot memory) {
        require(_index < snapshots[_company].length, "Index out of bounds");
        return snapshots[_company][_index];
    }

    /// @notice Calculates the 90-day rolling Security Hygiene Score
    /// @param _company The address of the company.
    /// @return The averaged SHS score (0-100).
    function getSecurityHygieneScore(address _company) external view returns (uint8) {
        uint256 count = snapshots[_company].length;
        if (count == 0) return 0;

        uint256 totalScore = 0;
        uint256 daysToAverage = count < 90 ? count : 90;

        for (uint256 i = count - daysToAverage; i < count; i++) {
            totalScore += snapshots[_company][i].complianceScore;
        }

        return uint8(totalScore / daysToAverage);
    }
}
