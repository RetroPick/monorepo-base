// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Test-only ERC20 with optional faucet-restricted minting.
/// @dev
/// This contract exists for tests/devnets. It is NOT intended for production deployments.
/// `MarketEngine` explicitly rejects non-standard ERC20 behavior (fee-on-transfer / rebasing) by checking
/// balance deltas on transfer; this mock behaves like a standard ERC20.
contract MockERC20 is ERC20 {
    /// @dev If non-zero, restrict minting to this faucet address.
    address public immutable FAUCET;

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        address faucet_
    ) ERC20(name, symbol) {
        FAUCET = faucet_;
        _mint(msg.sender, supply);
    }

    /// @notice Mint tokens to caller (legacy dev helper).
    /// @dev If `faucet != address(0)`, only the faucet may mint (for use by `TokenFaucet`).
    function mintTokens(uint256 _amount) external {
        // Backwards-compatible: if faucet is not set, anyone can mint (legacy tests/dev usage).
        if (FAUCET != address(0) && msg.sender != FAUCET) revert("FAUCET_ONLY");
        _mint(msg.sender, _amount);
    }

    /// @notice Mint tokens to a recipient (faucet-only).
    /// @dev Used by `TokenFaucet` to mint to requesters while preventing arbitrary third-party minting.
    function mintTo(address to, uint256 amount) external {
        if (msg.sender != FAUCET) revert("FAUCET_ONLY");
        _mint(to, amount);
    }
}