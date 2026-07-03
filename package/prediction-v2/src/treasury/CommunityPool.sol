// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/// @title CommunityPool holds sponsored campaign budgets (optional).
contract CommunityPool is Ownable, Pausable {
    using SafeERC20 for IERC20;

    event CommunityFunded(address indexed token, address indexed campaign, uint256 amount, bytes32 batchId);

    constructor(address owner_) Ownable(owner_) {}

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundCampaign(address token, address campaign, uint256 amount, bytes32 batchId) external onlyOwner whenNotPaused {
        require(campaign != address(0), "CommunityPool: zero campaign");
        require(amount > 0, "CommunityPool: zero amount");
        IERC20(token).safeTransfer(campaign, amount);
        emit CommunityFunded(token, campaign, amount, batchId);
    }
}
