// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Deflationary ERC20 test double (fee-on-transfer).
contract FeeOnTransferERC20 is ERC20 {
    uint16 public immutable FEE_BPS;
    address public immutable FEE_SINK;

    constructor(string memory name_, string memory symbol_, uint16 feeBps_, address feeSink_) ERC20(name_, symbol_) {
        FEE_BPS = feeBps_;
        FEE_SINK = feeSink_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0) && to != address(0) && FEE_BPS != 0) {
            uint256 fee = (value * uint256(FEE_BPS)) / 10_000;
            uint256 net = value - fee;
            super._update(from, FEE_SINK, fee);
            super._update(from, to, net);
            return;
        }
        super._update(from, to, value);
    }
}

