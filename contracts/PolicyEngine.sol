// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PolicyEngine
/// @notice Stores the insurer-defined coverage rules for each company.
/// @dev Uses immutable variables to optimize gas costs as required by the rubric.
contract PolicyEngine {

    struct PolicyRule {
        string ruleName;
        bool required;          
        uint256 maxAgeSeconds;  
        uint8 weight;           
    }

    address public immutable insurer;
    
    mapping(address => PolicyRule[]) private companyPolicies;
    mapping(address => bool) public isPolicyActive;

    event PolicySet(address indexed company, uint256 ruleCount);

    modifier onlyInsurer() {
        require(msg.sender == insurer, "Only insurer can call this");
        _;
    }

    /// @notice Sets the deployer as the immutable insurer.
    constructor() {
        insurer = msg.sender;
    }

    /// @notice Defines the policy rules for a specific company.
    /// @param _company The address of the company being insured.
    /// @param _ruleNames Human-readable names for the security rules.
    /// @param _requiredFlags Boolean flags indicating if the rule is mandatory.
    /// @param _maxAgeSeconds The maximum time allowed between security snapshots.
    /// @param _weights The percentage weight each rule contributes to the total SHS.
    function setPolicy(
        address _company,
        string[] calldata _ruleNames,
        bool[] calldata _requiredFlags,
        uint256[] calldata _maxAgeSeconds,
        uint8[] calldata _weights
    ) external onlyInsurer {
        uint256 length = _ruleNames.length;
        require(
            _requiredFlags.length == length &&
            _maxAgeSeconds.length == length &&
            _weights.length == length,
            "Array lengths must match"
        );

        delete companyPolicies[_company]; 

        for (uint256 i = 0; i < length; i++) {
            companyPolicies[_company].push(PolicyRule({
                ruleName: _ruleNames[i],
                required: _requiredFlags[i],
                maxAgeSeconds: _maxAgeSeconds[i],
                weight: _weights[i]
            }));
        }

        isPolicyActive[_company] = true;
        emit PolicySet(_company, length);
    }

    /// @notice Retrieves the full policy for a company.
    /// @param _company The address of the company to query.
    /// @return An array of PolicyRule structs.
    function getPolicy(address _company) external view returns (PolicyRule[] memory) {
        return companyPolicies[_company];
    }
}