// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ClaimsProcessor.sol";

contract MaliciousAttacker {
    ClaimsProcessor public targetContract;
    uint256 public attackClaimId;

    function deployTarget(address posture, address policy, address token) external {
        targetContract = new ClaimsProcessor(posture, policy, token, address(this));
    }

    function recordFraudScore(uint256 _claimId, uint8 _score, bytes32 _hash) external {
        targetContract.recordFraudScore(_claimId, _score, _hash);
    }

    function attack(uint256 _claimId) external {
        attackClaimId = _claimId;
        targetContract.processClaim(_claimId);
    }

    // Intercept external calls (like getActionCountByTimeRange) and reenter
    fallback() external {
        targetContract.processClaim(attackClaimId);
    }
}
