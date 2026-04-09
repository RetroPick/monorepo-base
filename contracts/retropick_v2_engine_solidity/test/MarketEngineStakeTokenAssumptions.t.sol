// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {UnsafeUpgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {MarketEngine} from "../src/MarketEngine.sol";
import {MarketTypes} from "../src/types/MarketTypes.sol";
import {FeeOnTransferERC20} from "./mocks/FeeOnTransferERC20.sol";
import {MockPriceOracle} from "./mocks/MockPriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketEngineStakeTokenAssumptionsTest is Test {
    MarketEngine internal engine;
    FeeOnTransferERC20 internal fot;
    MockPriceOracle internal oracle;

    address internal admin = address(0xA11CE);
    address internal treasury = address(0xFEE);
    address internal worker = address(0xB0B);
    bytes32 internal feed = keccak256("feed");

    function setUp() public {
        fot = new FeeOnTransferERC20("FOT", "FOT", 1000, address(0xdead)); // 10% fee
        oracle = new MockPriceOracle();

        MarketEngine impl = new MarketEngine();
        bytes memory initData = abi.encodeCall(
            MarketEngine.initialize,
            (
                IERC20(address(fot)),
                oracle,
                admin,
                treasury,
                worker,
                100,
                500,
                8,
                MarketTypes.OracleKind.Chainlink,
                3600,
                10_000
            )
        );
        engine = MarketEngine(UnsafeUpgrades.deployUUPSProxy(address(impl), initData));
    }

    function test_deposit_reverts_for_fee_on_transfer_stakeToken() public {
        vm.startPrank(admin);
        MarketEngine.UpsertTemplateParams memory p;
        p.slug = "fot";
        p.assetSymbol = "ETH";
        p.oracleFeedId = feed;
        p.marketType = MarketTypes.MarketType.Threshold;
        p.condition = MarketTypes.Condition.AtOrAbove;
        p.thresholdRule = MarketTypes.ThresholdRule.Absolute;
        p.active = true;
        p.outcomeCount = 2;
        p.absoluteThresholdValueE8 = 100e8;
        p.switchFeeBps = 0;
        p.settlementFeeBps = 0;
        p.allowMultiSidePositions = true;
        p.executionMode = MarketTypes.ExecutionMode.Manual;
        engine.upsertTemplate(p);
        bytes32 tid = engine.templateIdFromSlug("fot");
        engine.initializeMarket(tid);
        vm.stopPrank();

        uint64 t0 = 1_000_000;
        vm.warp(t0);
        vm.prank(worker);
        engine.openEpoch(tid, 1, t0 + 10, t0 + 20, t0 + 30);
        vm.warp(t0 + 15);

        fot.mint(address(this), 100e18);
        fot.approve(address(engine), type(uint256).max);

        vm.expectRevert(MarketEngine.NonStandardStakeToken.selector);
        engine.depositToSide(tid, 1, 0, 100e18);
    }
}

