// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IMarketEngineFees} from "./interfaces/IMarketEngineFees.sol";

/// @title FeeRouter pulls fees from MarketEngine and routes exact allocations.
contract FeeRouter is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IMarketEngineFees public marketEngine;
    address public treasuryVault;
    address public rewardsVault;
    address public communityPool;

    mapping(bytes32 => bool) public routedBatches;

    event FeesRouted(
        bytes32 indexed batchId,
        address indexed token,
        uint256 grossAmount,
        uint256 treasuryAmount,
        uint256 rewardsAmount,
        uint256 communityAmount,
        bytes32 allocationHash
    );

    constructor(address owner_, address marketEngine_, address treasuryVault_, address rewardsVault_, address communityPool_) Ownable(owner_) {
        require(marketEngine_ != address(0), "FeeRouter: zero engine");
        require(treasuryVault_ != address(0), "FeeRouter: zero treasury");
        require(rewardsVault_ != address(0), "FeeRouter: zero rewards");
        marketEngine = IMarketEngineFees(marketEngine_);
        treasuryVault = treasuryVault_;
        rewardsVault = rewardsVault_;
        communityPool = communityPool_;
    }

    function setVaults(address treasuryVault_, address rewardsVault_, address communityPool_) external onlyOwner {
        require(treasuryVault_ != address(0), "FeeRouter: zero treasury");
        require(rewardsVault_ != address(0), "FeeRouter: zero rewards");
        treasuryVault = treasuryVault_;
        rewardsVault = rewardsVault_;
        communityPool = communityPool_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function pullAndRoute(
        bytes32 templateId,
        address token,
        uint256 grossAmount,
        uint256 treasuryAmount,
        uint256 rewardsAmount,
        uint256 communityAmount,
        bytes32 batchId,
        bytes32 allocationHash
    ) external onlyOwner nonReentrant whenNotPaused {
        require(!routedBatches[batchId], "FeeRouter: batch replay");
        require(grossAmount > 0, "FeeRouter: zero amount");
        require(treasuryAmount + rewardsAmount + communityAmount == grossAmount, "FeeRouter: bad allocation");

        routedBatches[batchId] = true;

        marketEngine.withdrawFees(templateId, grossAmount);

        IERC20 erc20 = IERC20(token);
        if (treasuryAmount > 0) {
            erc20.safeTransfer(treasuryVault, treasuryAmount);
        }
        if (rewardsAmount > 0) {
            erc20.safeTransfer(rewardsVault, rewardsAmount);
        }
        if (communityAmount > 0) {
            require(communityPool != address(0), "FeeRouter: community disabled");
            erc20.safeTransfer(communityPool, communityAmount);
        }

        emit FeesRouted(batchId, token, grossAmount, treasuryAmount, rewardsAmount, communityAmount, allocationHash);
    }
}
