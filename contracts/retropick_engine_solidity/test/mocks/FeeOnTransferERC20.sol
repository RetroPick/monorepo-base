// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Deflationary ERC20 test double (fee-on-transfer).
contract FeeOnTransferERC20 is ERC20 {
    uint16 public immutable feeBps;
    address public immutable feeSink;

    constructor(string memory name_, string memory symbol_, uint16 feeBps_, address feeSink_) ERC20(name_, symbol_) {
        feeBps = feeBps_;
        feeSink = feeSink_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && feeBps != 0) {
            uint256 fee = (value * uint256(feeBps)) / 10_000;
            uint256 net = value - fee;
            super._update(from, feeSink, fee);
            super._update(from, to, net);
            return;
        }
        super._update(from, to, value);
    }
}

