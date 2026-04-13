// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockERC20} from "../src/test/MockERC20.sol";
import {MockAToken} from "../src/test/MockAToken.sol";
import {MockAavePool} from "../src/test/MockAavePool.sol";
import {YieldRouterAaveV3} from "../src/yield/YieldRouterAaveV3.sol";

contract YieldRouterAaveV3Test is Test {
    MockERC20 internal stake;
    MockAToken internal aToken;
    MockAavePool internal pool;
    YieldRouterAaveV3 internal router;

    address internal engine = address(this);
    bytes32 internal t0 = keccak256("t0");
    bytes32 internal t1 = keccak256("t1");

    function setUp() public {
        stake = new MockERC20();
        aToken = new MockAToken();
        pool = new MockAavePool(address(stake), address(aToken));
        router = new YieldRouterAaveV3(address(stake), address(pool), address(aToken), engine);
    }

    function test_deposit_mintsSharesAndTracksPrincipal() public {
        stake.mint(engine, 1000);
        stake.approve(address(router), 1000);

        router.deposit(t0, 1000);

        assertEq(router.principalByTemplate(t0), 1000);
        assertEq(router.sharesByTemplate(t0), 1000);
        assertEq(aToken.balanceOf(address(router)), 1000);
    }

    function test_withdraw_partial_isProportional() public {
        pool.setYieldBps(500); // 5% on withdraw

        stake.mint(engine, 10_000);
        stake.approve(address(router), 10_000);

        router.deposit(t0, 6000);
        router.deposit(t0, 4000);

        uint256 balBefore = stake.balanceOf(engine);
        uint256 gross = router.withdraw(t0, 5000);
        uint256 balAfter = stake.balanceOf(engine);

        assertEq(balAfter - balBefore, gross);
        assertGt(gross, 5000);
        assertEq(router.principalByTemplate(t0), 5000);
        assertEq(router.sharesByTemplate(t0), 5000);
    }

    function test_emergencyWithdraw_zerosState() public {
        stake.mint(engine, 1000);
        stake.approve(address(router), 1000);
        router.deposit(t1, 1000);

        uint256 gross = router.emergencyWithdraw(t1);
        assertGt(gross, 0);

        assertEq(router.principalByTemplate(t1), 0);
        assertEq(router.sharesByTemplate(t1), 0);
    }
}

