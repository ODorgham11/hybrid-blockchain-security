// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title DailyReportRegistry
/// @notice Stores daily summaries of AI actions and security posture on the blockchain.
contract DailyReportRegistry {

    struct DailyReport {
        bytes32 reportHash;      // SHA256 of the full report JSON
        uint256 timestamp;       // When this report was submitted
        uint256 totalActions;    // Count of AI actions that day
        uint8 avgRiskLevel;      // Average risk (0-3)
        bool submitted;
    }

    /// @notice A mapping of the day index to its corresponding DailyReport.
    mapping(uint256 => DailyReport) public dailyReports;  
    
    /// @notice An auto-incrementing integer representing the current tracking day.
    uint256 public currentDay;  
    
    /// @notice The centralized backend agent authorized to submit reports.
    address public backendSystem;

    event DailyReportSubmitted(uint256 indexed day, bytes32 reportHash, uint256 totalActions);

    /// @notice Restricts access to only the authorized backend system.
    modifier onlyBackend() {
        require(msg.sender == backendSystem, "Only backend can submit");
        _;
    }

    /// @notice Initializes the contract and sets the backend system to the deployer.
    constructor() {
        backendSystem = msg.sender;
    }

    /// @notice Submit a daily security report hash to the blockchain
    /// @dev Only callable by the backend system address set in constructor
    /// @param _reportHash SHA256 hash of the full JSON report stored off-chain
    /// @param _totalActions Total number of AI actions recorded this day
    /// @param _avgRiskLevel Average risk level from 0 (LOW) to 3 (CRITICAL)
    /// @custom:security This function is protected by onlyBackend modifier
    function submitDailyReport(bytes32 _reportHash, uint256 _totalActions, uint8 _avgRiskLevel) external onlyBackend {
        dailyReports[currentDay] = DailyReport({
            reportHash: _reportHash,
            timestamp: block.timestamp,
            totalActions: _totalActions,
            avgRiskLevel: _avgRiskLevel,
            submitted: true
        });

        emit DailyReportSubmitted(currentDay, _reportHash, _totalActions);
        currentDay++;
    }

    /// @notice Retrieves a specific daily report
    /// @dev Reverts if the requested day has not been submitted yet.
    /// @param _day The day number of the report
    /// @return The DailyReport struct containing all details for that day
    function getReport(uint256 _day) external view returns (DailyReport memory) {
        require(dailyReports[_day].submitted, "Report for this day does not exist");
        return dailyReports[_day];
    }

    /// @notice Returns the current day index
    /// @dev This index represents the day that will be assigned to the NEXT report.
    /// @return The zero-indexed current day number
    function getCurrentDay() external view returns (uint256) {
        return currentDay;
    }
}
