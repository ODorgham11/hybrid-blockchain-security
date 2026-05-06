// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Cyber Insurance Token (CIT)
/// @notice ERC20 Token used for paying out approved cyber insurance claims.
/// @dev Implements Choice A of the Asset Standards requirement.
contract CyberToken is ERC20, Ownable {
    
    /// @notice Constructor mints initial supply to the deployer.
    /// @param initialSupply The amount of tokens to mint upon deployment.
    constructor(uint256 initialSupply) ERC20("Cyber Insurance Token", "CIT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    /// @notice Allows the owner to mint additional tokens if the reserve runs low.
    /// @param to The address receiving the newly minted tokens.
    /// @param amount The number of tokens to mint.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}