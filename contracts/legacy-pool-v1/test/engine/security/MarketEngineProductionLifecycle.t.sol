// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {MarketEngineBase} from "../../MarketEngineBase.t.sol";

/// @dev Production-hardening lifecycle guards (Sprint 2 P0.4).
contract MarketEngineProductionLifecycleTest is MarketEngineBase {
    function test_depositToSide_revertsAfterLock() public {
        bytes32 tid = _openEpoch("prod-lock-deposit");

        vm.warp(block.timestamp + 11);
        vm.prank(worker);
        engine.lockEpoch(tid, 1);

        address user = address(0xC0FFEE);
        token.mint(user, 100e18);
        vm.startPrank(user);
        token.approve(address(engine), type(uint256).max);
        vm.expectRevert(bytes4(keccak256("BettingClosed()")));
        engine.depositToSide(tid, 1, 0, 10e18);
        vm.stopPrank();
    }

    function test_claim_revertsBeforeResolve() public {
        bytes32 tid = _openEpoch("prod-claim-early");

        address user = address(0xBEEF);
        token.mint(user, 100e18);
        vm.startPrank(user);
        token.approve(address(engine), type(uint256).max);
        engine.depositToSide(tid, 1, 0, 50e18);
        vm.expectRevert(bytes4(keccak256("ClaimNotAvailable()")));
        engine.claim(tid, 1);
        vm.stopPrank();
    }

    function test_resolveEpoch_revertsWhenAlreadyResolved() public {
        bytes32 tid = _openEpoch("prod-double-resolve");

        vm.warp(block.timestamp + 11);
        vm.prank(worker);
        engine.lockEpoch(tid, 1);

        vm.warp(block.timestamp + 21);
        oracle.set(feed, 120e8, uint64(block.timestamp), 0);
        vm.prank(worker);
        engine.resolveEpoch(tid, 1);

        vm.prank(worker);
        vm.expectRevert(bytes4(keccak256("TooEarlyToResolve()")));
        engine.resolveEpoch(tid, 1);
    }

    function _openEpoch(string memory slug) internal returns (bytes32 tid) {
        vm.startPrank(admin);
        engine.upsertTemplate(_defaultThresholdTemplate(slug));
        tid = _tid(slug);
        engine.initializeMarket(tid);
        vm.stopPrank();

        uint64 t0 = uint64(block.timestamp);
        vm.prank(worker);
        engine.openEpoch(tid, 1, t0, t0 + 10, t0 + 20);
    }
}
