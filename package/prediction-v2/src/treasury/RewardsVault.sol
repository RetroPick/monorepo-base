// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RewardsVault holds referral/quest reward budgets.
contract RewardsVault is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(address => bool) public allowedDestinations;

    event DestinationUpdated(address indexed destination, bool allowed);
    event RewardFundingSent(
        bytes32 indexed batchId,
        address indexed token,
        address indexed destination,
        uint256 amount,
        bytes32 accountingRoot
    );

    constructor(address owner_) Ownable(owner_) {}

    function setDestinationAllowed(address destination, bool allowed) external onlyOwner {
        allowedDestinations[destination] = allowed;
        emit DestinationUpdated(destination, allowed);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundRewardDestination(
        address token,
        address destination,
        uint256 amount,
        bytes32 batchId,
        bytes32 accountingRoot
    ) external onlyOwner nonReentrant whenNotPaused {
        require(allowedDestinations[destination], "RewardsVault: destination not allowed");
        require(amount > 0, "RewardsVault: zero amount");
        IERC20(token).safeTransfer(destination, amount);
        emit RewardFundingSent(batchId, token, destination, amount, accountingRoot);
    }
}
