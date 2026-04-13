// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {YieldAccounting} from "../src/libraries/YieldAccounting.sol";

contract YieldAccountingTest is Test {
    using YieldAccounting for uint256;

    function test_scaledToReal_identity() public pure {
        assertEq(YieldAccounting.scaledToReal(1e6, 1e27), 1e6);
    }

    function test_scaledToReal_doubledIndex() public pure {
        assertEq(YieldAccounting.scaledToReal(1e6, 2e27), 2e6);
    }

    function test_proportionalUnderlying_half() public pure {
        uint256 u = YieldAccounting.proportionalUnderlying(1000e18, 1000e18, 500e18, 1e27);
        assertEq(u, 500e18);
    }
}
