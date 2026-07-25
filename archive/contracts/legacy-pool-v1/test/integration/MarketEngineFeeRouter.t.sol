// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MarketEngineBase} from "../MarketEngineBase.t.sol";
import {FeeRouter} from "../../src/treasury/FeeRouter.sol";
import {TreasuryVault} from "../../src/treasury/TreasuryVault.sol";
import {RewardsVault} from "../../src/treasury/RewardsVault.sol";
import {CommunityPool} from "../../src/treasury/CommunityPool.sol";

/// @dev End-to-end: real MarketEngineDispatcher accrues fees, FeeRouter pulls via withdrawFees, splits to vaults.
contract MarketEngineFeeRouterIntegrationTest is MarketEngineBase {
    TreasuryVault internal treasuryVault;
    RewardsVault internal rewardsVault;
    CommunityPool internal communityPool;
    FeeRouter internal router;

    bytes32 internal constant BATCH = keccak256("integration-batch-1");

    function setUp() public override {
        super.setUp();

        treasuryVault = new TreasuryVault(admin);
        rewardsVault = new RewardsVault(admin);
        communityPool = new CommunityPool(admin);
        router = new FeeRouter(admin, address(engine), address(treasuryVault), address(rewardsVault), address(communityPool));

        vm.prank(admin);
        engine.setTreasury(address(router));
    }

    function test_integration_pullAndRoute_fullAllocationFromRealEngine() public {
        bytes32 tid = _accrueFeesOnResolvedEpoch("me-fr-int");

        (, , uint256 feesBefore) = engine.getVaultBalances(tid);
        assertGt(feesBefore, 0, "fees accrued");

        uint256 treasuryAmt = feesBefore * 40 / 100;
        uint256 rewardsAmt = feesBefore * 50 / 100;
        uint256 communityAmt = feesBefore - treasuryAmt - rewardsAmt;

        vm.prank(admin);
        router.pullAndRoute(tid, address(token), feesBefore, treasuryAmt, rewardsAmt, communityAmt, BATCH, bytes32(uint256(7)));

        assertEq(token.balanceOf(address(treasuryVault)), treasuryAmt);
        assertEq(token.balanceOf(address(rewardsVault)), rewardsAmt);
        assertEq(token.balanceOf(address(communityPool)), communityAmt);
        assertTrue(router.routedBatches(BATCH));

        (, , uint256 feesAfter) = engine.getVaultBalances(tid);
        assertEq(feesAfter, 0, "engine fee vault drained");
    }

    function test_integration_pullAndRoute_revertsOnBadAllocationSum() public {
        bytes32 tid = _accrueFeesOnResolvedEpoch("me-fr-bad-sum");
        (, , uint256 feesBefore) = engine.getVaultBalances(tid);

        vm.prank(admin);
        vm.expectRevert(bytes("FeeRouter: bad allocation"));
        router.pullAndRoute(tid, address(token), feesBefore, feesBefore / 2, feesBefore / 2, 1, BATCH, bytes32(0));
    }

    function test_integration_pullAndRoute_revertsOnBatchReplay() public {
        bytes32 tid = _accrueFeesOnResolvedEpoch("me-fr-replay");
        (, , uint256 feesBefore) = engine.getVaultBalances(tid);

        vm.startPrank(admin);
        router.pullAndRoute(tid, address(token), feesBefore, feesBefore, 0, 0, BATCH, bytes32(0));
        vm.expectRevert(bytes("FeeRouter: batch replay"));
        router.pullAndRoute(tid, address(token), feesBefore, feesBefore, 0, 0, BATCH, bytes32(0));
        vm.stopPrank();
    }

    function test_integration_pullAndRoute_revertsWhenPaused() public {
        bytes32 tid = _accrueFeesOnResolvedEpoch("me-fr-pause");
        (, , uint256 feesBefore) = engine.getVaultBalances(tid);

        vm.startPrank(admin);
        router.pause();
        vm.expectRevert();
        router.pullAndRoute(tid, address(token), feesBefore, feesBefore, 0, 0, keccak256("batch-pause"), bytes32(0));
        vm.stopPrank();
    }

    function test_integration_pullAndRoute_revertsForNonOwner() public {
        bytes32 tid = _accrueFeesOnResolvedEpoch("me-fr-auth");
        (, , uint256 feesBefore) = engine.getVaultBalances(tid);

        vm.prank(address(0xDEAD));
        vm.expectRevert();
        router.pullAndRoute(tid, address(token), feesBefore, feesBefore, 0, 0, keccak256("batch-auth"), bytes32(0));
    }

    function _accrueFeesOnResolvedEpoch(string memory slug) internal returns (bytes32 tid) {
        vm.startPrank(admin);
        engine.upsertTemplate(_defaultThresholdTemplate(slug));
        tid = _tid(slug);
        engine.initializeMarket(tid);
        vm.stopPrank();

        uint64 t0 = 2_000_000;
        vm.warp(t0);
        vm.prank(worker);
        engine.openEpoch(tid, 1, t0, t0 + 10, t0 + 20);

        address userA = address(0xA001);
        address userB = address(0xB002);
        token.mint(userA, 1000e18);
        token.mint(userB, 1000e18);

        vm.startPrank(userA);
        token.approve(address(engine), type(uint256).max);
        engine.depositToSide(tid, 1, 0, 1000e18);
        vm.stopPrank();

        vm.startPrank(userB);
        token.approve(address(engine), type(uint256).max);
        engine.depositToSide(tid, 1, 1, 1000e18);
        vm.stopPrank();

        vm.warp(t0 + 11);
        vm.prank(worker);
        engine.lockEpoch(tid, 1);

        vm.warp(t0 + 21);
        oracle.set(feed, 120e8, t0 + 21, 0);
        vm.prank(worker);
        engine.resolveEpoch(tid, 1);
    }
}
