// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    /// @dev If non-zero, restrict minting to this faucet address.
    address public immutable faucet;

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        address faucet_
    ) ERC20(name, symbol) {
        faucet = faucet_;
        _mint(msg.sender, supply);
    }

    function mintTokens(uint256 _amount) external {
        // Backwards-compatible: if faucet is not set, anyone can mint (legacy tests/dev usage).
        if (faucet != address(0) && msg.sender != faucet) revert("FAUCET_ONLY");
        _mint(msg.sender, _amount);
    }

    function mintTo(address to, uint256 amount) external {
        if (msg.sender != faucet) revert("FAUCET_ONLY");
        _mint(to, amount);
    }
}