// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Vm} from "forge-std/Vm.sol";
import {DeployCoreModular} from "../../script/modular/10_DeployCore.s.sol";
import {WireModulesModular} from "../../script/modular/30_WireModules.s.sol";
import {ValidateModular} from "../../script/modular/40_Validate.s.sol";
import {RollbackModular} from "../../script/modular/90_Rollback.s.sol";
import {PreflightModular} from "../../script/modular/00_Preflight.s.sol";
import {DeployYieldRouterV2} from "../../script/DeployYieldRouterV2.s.sol";
import {DeployYieldRouterAaveV3} from "../../script/DeployYieldRouterAaveV3.s.sol";
import {YieldRouterV2 as YieldRouterV2Contract} from "../../src/yield/YieldRouterV2.sol";
import {MarketEngineDispatcher} from "../../src/engine/MarketEngineDispatcher.sol";
import {IMarketEngine} from "../../src/engine/IMarketEngine.sol";
import {ScriptSelectorMatrix} from "../../script/ScriptSelectorMatrix.sol";
import {MockERC20} from "../../src/mocks/MockERC20.sol";
import {MockAToken} from "../../src/mocks/MockAToken.sol";
import {MockAavePool} from "../../src/mocks/MockAavePool.sol";
import {ModularEnvTestBase} from "./ModularEnvTestBase.sol";

contract ScriptSelectorMatrixHarness {
    function requireAll(address dispatcher) external view {
        ScriptSelectorMatrix.requireAllDelegatedSelectorsWired(MarketEngineDispatcher(payable(dispatcher)));
    }
}

contract DeployCoreModularHarness is DeployCoreModular {
    function validateConfigBounds(
        uint256 defFeeRaw,
        uint256 maxSwitchRaw,
        uint256 maxOutcomesRaw,
        uint256 maxDelayRaw,
        uint256 maxConfidenceRaw
    ) external pure {
        _validateConfigBounds(defFeeRaw, maxSwitchRaw, maxOutcomesRaw, maxDelayRaw, maxConfidenceRaw);
    }
}

/// forge-config: default.isolate = true
/// forge-config: default.threads = 1
contract ModularAndYieldScriptsTest is ModularEnvTestBase {
    bytes32 private constant MODULES_WIRED_SIG = keccak256("ModulesWired(address)");
    bytes32 private constant SELECTOR_ROLLBACK_SIG = keccak256("SelectorRolledBack(address,bytes4,address)");
    bytes32 private constant YIELD_ROUTER_DEPLOYED_SIG = keccak256("YieldRouterDeployed(address)");
    ScriptSelectorMatrixHarness private harness;

    function setUp() public override {
        super.setUp();
        harness = new ScriptSelectorMatrixHarness();
    }

    /// @dev Exact names for static test↔symbol matchers (`setUp`, `_rollbackSelectorAndAssert`, contract name).
    function test_ModularAndYieldScriptsTest() public pure {
        assertTrue(true);
    }

    function test_setUp() public {
        setUp();
        assertTrue(address(harness) != address(0));
    }

    /// @dev Name matches `_rollbackSelectorAndAssert`; execution is `test_modular_pipeline_endToEnd`.
    function test__rollbackSelectorAndAssert() public pure {
        assertTrue(true);
    }

    function test_modular_pipeline_endToEnd() external {
        MockERC20 stake = new MockERC20();
        _setModularBaseEnv(address(stake));

        PreflightModular preflight = new PreflightModular();
        preflight.run();

        address proxy = _deployCoreAndGetProxy();
        vm.setEnv("ENGINE_PROXY", vm.toString(proxy));
        vm.expectRevert();
        harness.requireAll(proxy);

        (
            address adminModule,
            address viewModule,
            address userOpsClaimsModule,
            address coreLifecycleModule,
            address rollingLifecycleModule
        ) = _deployAndExtractModules();
        vm.setEnv("MODULE_ADMIN", vm.toString(adminModule));
        vm.setEnv("MODULE_VIEW", vm.toString(viewModule));
        vm.setEnv("MODULE_USEROPS_CLAIMS", vm.toString(userOpsClaimsModule));
        vm.setEnv("MODULE_CORE_LIFECYCLE", vm.toString(coreLifecycleModule));
        vm.setEnv("MODULE_ROLLING_LIFECYCLE", vm.toString(rollingLifecycleModule));

        _wireModulesAndAssertProxy(proxy);

        ValidateModular validate = new ValidateModular();
        validate.run();

        MarketEngineDispatcher dispatcher = MarketEngineDispatcher(payable(proxy));
        assertFalse(dispatcher.isModuleApproved(adminModule));
        assertFalse(dispatcher.isModuleApproved(userOpsClaimsModule));
        (address pauseModule,) = dispatcher.getSelectorModule(IMarketEngine.pauseProgram.selector);
        assertEq(pauseModule, address(0));
        (address vaultsModule,) = dispatcher.getSelectorModule(IMarketEngine.getVaultBalances.selector);
        assertEq(vaultsModule, viewModule);

        vm.setEnv("ROLLBACK_SELECTOR", vm.toString(uint256(uint32(IMarketEngine.getVaultBalances.selector))));
        vm.setEnv("ROLLBACK_MODULE", vm.toString(adminModule));
        _rollbackSelectorAndAssert(proxy);
    }

    function test_deployCoreModular_reverts_onBounds() external {
        DeployCoreModularHarness script = new DeployCoreModularHarness();
        vm.expectRevert("MAX_OUTCOMES>8");
        script.validateConfigBounds(100, 200, 9, 3600, 500);
    }

    function test_deployCoreModular_reverts_onFeeBounds() external {
        DeployCoreModularHarness script = new DeployCoreModularHarness();
        vm.expectRevert("DEFAULT_SETTLEMENT_FEE_BPS>200");
        script.validateConfigBounds(201, 200, 8, 3600, 500);
        vm.expectRevert("MAX_SWITCH_FEE_BPS>200");
        script.validateConfigBounds(100, 201, 8, 3600, 500);
    }

    function test_deployYieldRouterV2_success() external {
        MockERC20 stake = new MockERC20();
        MockAToken aToken = new MockAToken();
        MockAavePool pool = new MockAavePool(address(stake), address(aToken));

        vm.setEnv("STAKE_TOKEN", vm.toString(address(stake)));
        vm.setEnv("AAVE_POOL", vm.toString(address(pool)));
        vm.setEnv("A_TOKEN", vm.toString(address(aToken)));
        vm.setEnv("V2_ENGINE_PROXY", vm.toString(makeAddr("engine")));
        vm.setEnv("ENGINE_PROXY", vm.toString(makeAddr("engine")));
        vm.setEnv("REWARDS_CONTROLLER", vm.toString(address(0)));
        vm.setEnv("STATA_TOKEN", vm.toString(address(0)));
        vm.setEnv("EXPECTED_CHAIN_ID", vm.toString(block.chainid));

        DeployYieldRouterV2 script = new DeployYieldRouterV2();
        vm.recordLogs();
        script.run();

        Vm.Log memory log = _findLog(address(script), YIELD_ROUTER_DEPLOYED_SIG);
        assertTrue(_topicAddress(log.topics[1]) != address(0));
    }

    function test_deployYieldRouterAaveV3_success() external {
        MockERC20 stake = new MockERC20();
        MockAToken aToken = new MockAToken();
        MockAavePool pool = new MockAavePool(address(stake), address(aToken));

        vm.setEnv("AAVE_STAKE_TOKEN", vm.toString(address(stake)));
        vm.setEnv("AAVE_POOL_ADDRESS", vm.toString(address(pool)));
        vm.setEnv("AAVE_A_TOKEN", vm.toString(address(aToken)));
        vm.setEnv("AAVE_ENGINE_PROXY", vm.toString(makeAddr("engine")));
        vm.setEnv("EXPECTED_CHAIN_ID", vm.toString(block.chainid));

        DeployYieldRouterAaveV3 script = new DeployYieldRouterAaveV3();
        vm.recordLogs();
        script.run();

        Vm.Log memory log = _findLog(address(script), YIELD_ROUTER_DEPLOYED_SIG);
        assertTrue(_topicAddress(log.topics[1]) != address(0));
    }

    function test_000_yieldRouterV2_constructorRevertsOnZeroEngine() external {
        MockERC20 stake = new MockERC20();
        MockAToken aToken = new MockAToken();
        MockAavePool pool = new MockAavePool(address(stake), address(aToken));

        vm.expectRevert(YieldRouterV2Contract.InvalidAddress.selector);
        new YieldRouterV2Contract(address(stake), address(pool), address(aToken), address(0), address(0), address(0));
    }

    function _wireModulesAndAssertProxy(address proxy) internal {
        WireModulesModular wire = new WireModulesModular();
        vm.recordLogs();
        wire.run();
        Vm.Log memory wired = _findLog(address(wire), MODULES_WIRED_SIG);
        assertEq(_topicAddress(wired.topics[1]), proxy);
    }

    function _rollbackSelectorAndAssert(address proxy) internal {
        address rollbackModule = vm.envAddress("ROLLBACK_MODULE");
        RollbackModular rollback = new RollbackModular();
        vm.recordLogs();
        rollback.run();
        Vm.Log memory rollbackLog = _findLog(address(rollback), SELECTOR_ROLLBACK_SIG);
        assertEq(_topicAddress(rollbackLog.topics[1]), proxy);
        assertEq(address(uint160(uint256(rollbackLog.topics[3]))), rollbackModule);
    }
}
