// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title TreasuryVault holds protocol-owned fee revenue.
contract TreasuryVault is Ownable, Pausable {
    using SafeERC20 for IERC20;

    event TreasuryWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address owner_) Ownable(owner_) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdraw(address token, address to, uint256 amount) external onlyOwner whenNotPaused {
        require(to != address(0), "TreasuryVault: zero recipient");
        IERC20(token).safeTransfer(to, amount);
        emit TreasuryWithdrawn(token, to, amount);
    }
}
