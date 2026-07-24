// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IMarketEngineFees} from "../../src/treasury/interfaces/IMarketEngineFees.sol";

contract MockMarketEngineFees is IMarketEngineFees {
    using SafeERC20 for IERC20;

    IERC20 public token;
    address public treasury;
    uint256 public reserve;

    constructor(address token_) {
        token = IERC20(token_);
    }

    function setTreasury(address treasury_) external {
        treasury = treasury_;
    }

    function fundReserve(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        reserve += amount;
    }

    function withdrawFees(bytes32, uint256 amount) external {
        require(amount <= reserve, "MockMarketEngineFees: insufficient reserve");
        reserve -= amount;
        token.safeTransfer(treasury, amount);
    }
}
