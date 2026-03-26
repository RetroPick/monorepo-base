// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OracleNormalize} from "../src/oracle/OracleNormalize.sol";

contract OracleNormalizeTest is Test {
    function test_expo_negative8() public pure {
        (int256 v, uint256 c) = OracleNormalize.normalize(1e10, 5e8, -8);
        assertEq(v, 1e10);
        assertEq(c, 5e8);
    }

    function test_expo_negative6() public pure {
        (int256 v, uint256 c) = OracleNormalize.normalize(123456789, 100, -6);
        assertEq(v, 12345678900);
        assertEq(c, 10000);
    }
}
