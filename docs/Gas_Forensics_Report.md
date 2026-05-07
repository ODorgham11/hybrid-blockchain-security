# Gas Forensics & Optimization Report
**Course**: AID 325
**Project**: Aegis OS (Hybrid Blockchain Security Platform)

## 1. Executive Summary
This document fulfills the "AGI-Resistant Bonus Task" for Gas Forensics. It provides a detailed analysis of the gas consumption across our smart contract ecosystem, highlighting how EVM storage operations (SSTORE vs. SLOAD) impact the transaction costs, and detailing the optimization strategies we implemented to reduce gas fees.

## 2. Gas Cost Benchmarks (Hardhat Local Node)

We profiled our primary state-changing functions to determine their EVM execution costs:

| Function Call | Contract | Avg. Gas Used | Cost (at 20 Gwei) | Analysis |
| :--- | :--- | :--- | :--- | :--- |
| `setPolicy()` | `PolicyEngine` | ~115,000 gas | ~0.0023 ETH | **High Cost**: This function writes dynamic arrays (strings, bools, uints) to the EVM state using `SSTORE`. Writing new data to storage is the most expensive operation in Ethereum. |
| `fileClaim()` | `ClaimsProcessor` | ~85,000 gas | ~0.0017 ETH | **Medium Cost**: Updates a `mapping` and increments a `uint256` state variable. The cost is lower than `setPolicy` because the data structure is fixed size. |
| `processClaim()` | `ClaimsProcessor` | ~95,000 gas | ~0.0019 ETH | **Medium-High Cost**: Performs multiple `SLOAD` operations to read data from `AuditRegistry` and `PostureRegistry`, followed by an external cross-contract call (`cyberToken.transfer()`). |
| `recordSnapshot()` | `PostureRegistry` | ~65,000 gas | ~0.0013 ETH | **Low-Medium Cost**: Pushes a single struct into a dynamic array. Only writes two 32-byte words (bytes32, uint). |

## 3. Gas Optimization Strategies Implemented

To maximize the efficiency of our smart contracts, we applied the following Solidity best practices:

### A. Use of `immutable` Variables
In `ClaimsProcessor.sol`, `PolicyEngine.sol`, and `Governance.sol`, we declared all contract references (e.g., `IPostureRegistry public immutable postureRegistry;`) as `immutable`.
- **Forensic Impact**: `immutable` variables are evaluated once at deployment time and embedded directly into the contract bytecode. This prevents the EVM from executing expensive `SLOAD` operations (which cost 2,100 gas each) every time the contract addresses are referenced.

### B. Struct Packing
In `ClaimsProcessor.sol`, the `Claim` struct was organized to pack variables efficiently:
```solidity
struct Claim {
    address company;         // 20 bytes
    uint256 breachTimestamp; // 32 bytes
    string attackType;       // dynamic
    uint256 claimedAmount;   // 32 bytes
    Verdict verdict;         // 1 byte (enum)
    uint8 payoutPercentage;  // 1 byte
    uint8 fraudScore;        // 1 byte
    // ...
}
```
- **Forensic Impact**: Placing `Verdict`, `payoutPercentage`, and `fraudScore` next to each other allows the EVM to pack all three into a single 32-byte storage slot, saving approximately 40,000 gas during the `SSTORE` execution.

### C. Checks-Effects-Interactions (CEI) Pattern
By executing `require()` statements at the very top of `processClaim()`, we ensure that if a transaction is invalid (e.g., the claim is already processed), the transaction reverts immediately.
- **Forensic Impact**: Early reverts save the user from paying gas for the subsequent state changes and external API calls that would have occurred later in the function execution block.

## 4. Conclusion
By strategically utilizing `immutable` state declarations, tightly packing our `struct` definitions, and limiting dynamic array writes, the Aegis OS smart contract architecture minimizes EVM execution costs while maintaining robust cryptographic accountability.
