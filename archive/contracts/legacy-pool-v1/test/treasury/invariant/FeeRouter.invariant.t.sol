// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FeeRouter} from "../../../src/treasury/FeeRouter.sol";
import {MockERC20} from "../../../src/mocks/MockERC20.sol";
import {MockMarketEngineFees} from "../MockMarketEngineFees.sol";
import {TreasuryVault} from "../../../src/treasury/TreasuryVault.sol";
import {RewardsVault} from "../../../src/treasury/RewardsVault.sol";
import {CommunityPool} from "../../../src/treasury/CommunityPool.sol";

contract FeeRouterInvariantTest is Test {
    function testFuzz_validAllocationSucceeds(uint96 gross, uint96 tShare, uint96 rShare, uint96 cShare) public {
        if (gross == 0) {
            return;
        }
        uint256 totalShares = uint256(tShare) + uint256(rShare) + uint256(cShare);
        if (totalShares == 0) {
            return;
        }
        uint256 treasuryAmount = (uint256(gross) * uint256(tShare)) / totalShares;
        uint256 rewardsAmount = (uint256(gross) * uint256(rShare)) / totalShares;
        uint256 communityAmount = uint256(gross) - treasuryAmount - rewardsAmount;
        _route(gross, treasuryAmount, rewardsAmount, communityAmount);
    }

    function _route(uint256 gross, uint256 t, uint256 r, uint256 c) internal {
        MockERC20 token = new MockERC20();
        MockMarketEngineFees engine = new MockMarketEngineFees(address(token));
        TreasuryVault treasury = new TreasuryVault(address(this));
        RewardsVault rewards = new RewardsVault(address(this));
        CommunityPool community = new CommunityPool(address(this));
        FeeRouter router = new FeeRouter(address(this), address(engine), address(treasury), address(rewards), address(community));
        engine.setTreasury(address(router));
        token.mint(address(this), gross);
        token.approve(address(engine), gross);
        engine.fundReserve(gross);
        router.pullAndRoute(bytes32(uint256(1)), address(token), gross, t, r, c, keccak256("batch"), bytes32(0));
    }
}
