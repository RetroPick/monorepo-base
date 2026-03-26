// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MarketEngine} from "../src/MarketEngine.sol";
import {MarketTypes} from "../src/types/MarketTypes.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPriceOracle} from "./mocks/MockPriceOracle.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";

abstract contract MarketEngineBase is Test {
    MarketEngine internal engine;
    MockERC20 internal token;
    MockPriceOracle internal oracle;

    address internal admin = address(0xA11CE);
    address internal treasury = address(0xFEE);
    address internal worker = address(0xB0B);
    bytes32 internal feed = keccak256("feed");

    function setUp() public virtual {
        token = new MockERC20();
        oracle = new MockPriceOracle();

        engine = new MarketEngine();
        vm.prank(address(this));
        engine.initializeConfig(
            IERC20(address(token)),
            oracle,
            admin,
            treasury,
            worker,
            100,
            500,
            8,
            MarketTypes.OracleKind.Pyth,
            3600,
            10_000
        );
    }

    function _tid(string memory slug) internal view returns (bytes32) {
        return engine.templateIdFromSlug(slug);
    }

    function _defaultTemplate(string memory slug) internal view returns (MarketEngine.UpsertTemplateParams memory p) {
        p.slug = slug;
        p.assetSymbol = "ETH";
        p.oracleFeedId = feed;
        p.marketType = MarketTypes.MarketType.Threshold;
        p.condition = MarketTypes.Condition.AtOrAbove;
        p.thresholdRule = MarketTypes.ThresholdRule.Absolute;
        p.active = true;
        p.outcomeCount = 2;
        p.absoluteThresholdValueE8 = 100e8;
        p.switchFeeBps = 100;
        p.settlementFeeBps = 100;
        p.allowMultiSidePositions = true;
        p.executionMode = MarketTypes.ExecutionMode.Manual;
        p.rollingIntervalSeconds = 0;
        p.rollingBufferSeconds = 0;
    }
}
