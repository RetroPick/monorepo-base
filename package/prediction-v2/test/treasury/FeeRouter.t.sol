// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {FeeRouter} from "../../src/treasury/FeeRouter.sol";
import {TreasuryVault} from "../../src/treasury/TreasuryVault.sol";
import {RewardsVault} from "../../src/treasury/RewardsVault.sol";
import {CommunityPool} from "../../src/treasury/CommunityPool.sol";
import {MockMarketEngineFees} from "./MockMarketEngineFees.sol";

contract FeeRouterTest is Test {
    MockERC20 internal token;
    MockMarketEngineFees internal engine;
    TreasuryVault internal treasury;
    RewardsVault internal rewards;
    CommunityPool internal community;
    FeeRouter internal router;

    bytes32 internal constant TEMPLATE = bytes32(uint256(1));
    bytes32 internal constant BATCH = keccak256("batch-1");

    function setUp() public {
        token = new MockERC20();
        engine = new MockMarketEngineFees(address(token));
        treasury = new TreasuryVault(address(this));
        rewards = new RewardsVault(address(this));
        community = new CommunityPool(address(this));
        router = new FeeRouter(address(this), address(engine), address(treasury), address(rewards), address(community));
        engine.setTreasury(address(router));
        token.mint(address(this), 1_000 ether);
        token.approve(address(engine), type(uint256).max);
        engine.fundReserve(100 ether);
    }

    function test_pullAndRoute_fullAllocation() public {
        router.pullAndRoute(TEMPLATE, address(token), 100 ether, 40 ether, 50 ether, 10 ether, BATCH, bytes32(uint256(7)));

        assertEq(token.balanceOf(address(treasury)), 40 ether);
        assertEq(token.balanceOf(address(rewards)), 50 ether);
        assertEq(token.balanceOf(address(community)), 10 ether);
        assertTrue(router.routedBatches(BATCH));
    }

    function test_pullAndRoute_revertsOnBadSum() public {
        vm.expectRevert(bytes("FeeRouter: bad allocation"));
        router.pullAndRoute(TEMPLATE, address(token), 100 ether, 40 ether, 50 ether, 20 ether, BATCH, bytes32(0));
    }

    function test_pullAndRoute_revertsOnZeroAmount() public {
        vm.expectRevert(bytes("FeeRouter: zero amount"));
        router.pullAndRoute(TEMPLATE, address(token), 0, 0, 0, 0, BATCH, bytes32(0));
    }

    function test_pullAndRoute_revertsOnBatchReplay() public {
        router.pullAndRoute(TEMPLATE, address(token), 10 ether, 10 ether, 0, 0, BATCH, bytes32(0));
        vm.expectRevert(bytes("FeeRouter: batch replay"));
        router.pullAndRoute(TEMPLATE, address(token), 10 ether, 10 ether, 0, 0, BATCH, bytes32(0));
    }

    function test_rewardsVault_rejectsUnknownDestination() public {
        vm.expectRevert(bytes("RewardsVault: destination not allowed"));
        rewards.fundRewardDestination(address(token), address(0xBEEF), 1 ether, BATCH, bytes32(0));
    }

    function test_rewardsVault_fundsAllowedDestination() public {
        address dest = address(0xCAFE);
        rewards.setDestinationAllowed(dest, true);
        token.mint(address(this), 5 ether);
        token.transfer(address(rewards), 5 ether);
        rewards.fundRewardDestination(address(token), dest, 5 ether, BATCH, bytes32(uint256(1)));
        assertEq(token.balanceOf(dest), 5 ether);
    }

    function test_pauseBlocksRouting() public {
        router.pause();
        vm.expectRevert();
        router.pullAndRoute(TEMPLATE, address(token), 1 ether, 1 ether, 0, 0, keccak256("batch-2"), bytes32(0));
    }
}
