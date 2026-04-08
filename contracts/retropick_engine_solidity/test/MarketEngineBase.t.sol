// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {UnsafeUpgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {MarketEngine} from "../src/MarketEngine.sol";
import {MarketTypes} from "../src/types/MarketTypes.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockPriceOracle} from "./mocks/MockPriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

        MarketEngine impl = new MarketEngine();
        bytes memory initData = abi.encodeCall(
            MarketEngine.initialize,
            (
                IERC20(address(token)),
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

    function _tid(string memory slug) internal view returns (bytes32) {
        return engine.templateIdFromSlug(slug);
    }

    /// @dev Default Threshold market (legacy name kept for existing tests).
    function _defaultTemplate(string memory slug) internal view returns (MarketEngine.UpsertTemplateParams memory p) {
        return _defaultThresholdTemplate(slug);
    }

    function _defaultThresholdTemplate(string memory slug) internal view returns (MarketEngine.UpsertTemplateParams memory p) {
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
        p.oracleMaxDelaySeconds = 0;
        p.oracleMaxConfidenceBps = 0;
    }

    function _directionManualTemplate(string memory slug) internal view returns (MarketEngine.UpsertTemplateParams memory p) {
        p.slug = slug;
        p.assetSymbol = "ETH";
        p.oracleFeedId = feed;
        p.marketType = MarketTypes.MarketType.Direction;
        p.condition = MarketTypes.Condition.AtOrAbove;
        p.thresholdRule = MarketTypes.ThresholdRule.None;
        p.active = true;
        p.outcomeCount = 2;
        p.absoluteThresholdValueE8 = 0;
        p.switchFeeBps = 100;
        p.settlementFeeBps = 100;
        p.allowMultiSidePositions = true;
        p.executionMode = MarketTypes.ExecutionMode.Manual;
        p.rollingIntervalSeconds = 0;
        p.rollingBufferSeconds = 0;
        p.oracleMaxDelaySeconds = 0;
        p.oracleMaxConfidenceBps = 0;
    }

    /// @dev RangeClose: three buckets; bounds strictly increasing (see `_validateTemplate`).
    function _rangeCloseTemplate(string memory slug) internal view returns (MarketEngine.UpsertTemplateParams memory p) {
        p.slug = slug;
        p.assetSymbol = "ETH";
        p.oracleFeedId = feed;
        p.marketType = MarketTypes.MarketType.RangeClose;
        p.condition = MarketTypes.Condition.AtOrAbove;
        p.thresholdRule = MarketTypes.ThresholdRule.None;
        p.active = true;
        p.outcomeCount = 3;
        p.rangeBoundsE8[0] = 100e8;
        p.rangeBoundsE8[1] = 200e8;
        p.switchFeeBps = 100;
        p.settlementFeeBps = 100;
        p.allowMultiSidePositions = true;
        p.executionMode = MarketTypes.ExecutionMode.Manual;
        p.rollingIntervalSeconds = 0;
        p.rollingBufferSeconds = 0;
        p.oracleMaxDelaySeconds = 0;
        p.oracleMaxConfidenceBps = 0;
    }

    function _directionRollingTemplate(string memory slug, uint64 intervalSec, uint64 bufferSec)
        internal
        view
        returns (MarketEngine.UpsertTemplateParams memory p)
    {
        p.slug = slug;
        p.assetSymbol = "ETH";
        p.oracleFeedId = feed;
        p.marketType = MarketTypes.MarketType.Direction;
        p.condition = MarketTypes.Condition.AtOrAbove;
        p.thresholdRule = MarketTypes.ThresholdRule.None;
        p.active = true;
        p.outcomeCount = 2;
        p.absoluteThresholdValueE8 = 0;
        p.switchFeeBps = 100;
        p.settlementFeeBps = 100;
        p.allowMultiSidePositions = true;
        p.executionMode = MarketTypes.ExecutionMode.Rolling;
        p.rollingIntervalSeconds = intervalSec;
        p.rollingBufferSeconds = bufferSec;
        p.oracleMaxDelaySeconds = 0;
        p.oracleMaxConfidenceBps = 0;
    }

    /// @dev Genesis open then lock at `t0+interval` with oracle price at lock time (enters `Live`).
    function _rollingGenesisToLive(bytes32 templateId, uint64 t0, uint64 interval) internal {
        _rollingGenesisToLiveWithFeed(templateId, feed, t0, interval);
    }

    /// @dev Same as `_rollingGenesisToLive` but uses the template's oracle feed id (multi-asset tests).
    function _rollingGenesisToLiveWithFeed(bytes32 templateId, bytes32 oracleFeedId, uint64 t0, uint64 interval)
        internal
    {
        vm.warp(t0);
        vm.prank(worker);
        engine.genesisStartRolling(templateId);

        vm.warp(t0 + interval);
        oracle.set(oracleFeedId, 100e8, t0 + interval, 0);
        vm.prank(worker);
        engine.genesisLockRolling(templateId);
    }
}
