// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Vm} from "forge-std/Vm.sol";

/// @dev `vm.setEnv` is process-global; script tests must reset hot keys before each test.
library ScriptTestEnvReset {
    function reset(Vm vm) internal {
        vm.setEnv("EXPECTED_CHAIN_ID", vm.toString(block.chainid));
        vm.setEnv("MAX_OUTCOMES", "8");
        vm.setEnv("DEPLOY_FAUCET", "0");
        vm.setEnv("MAINNET_CHAIN_ID", "1");
        vm.setEnv("STAKE_TOKEN", vm.toString(address(0)));
        vm.setEnv("AAVE_STAKE_TOKEN", vm.toString(address(0)));
        vm.setEnv("ENGINE_PROXY", vm.toString(address(0)));
        vm.setEnv("V2_ENGINE_PROXY", vm.toString(address(0)));
        vm.setEnv("AAVE_ENGINE_PROXY", vm.toString(address(0)));
        vm.setEnv("PROXY_ADDRESS", vm.toString(address(0)));
        vm.setEnv("YIELD_ROUTER", vm.toString(address(0)));
        vm.setEnv("YIELD_FEE_BPS", "0");
        vm.setEnv("LM_REWARDS_ENABLED", "false");
        vm.setEnv("MODULE_ADMIN", vm.toString(address(0)));
        vm.setEnv("MODULE_VIEW", vm.toString(address(0)));
        vm.setEnv("MODULE_USEROPS_CLAIMS", vm.toString(address(0)));
        vm.setEnv("MODULE_CORE_LIFECYCLE", vm.toString(address(0)));
        vm.setEnv("MODULE_ROLLING_LIFECYCLE", vm.toString(address(0)));
        vm.setEnv("ROLLBACK_SELECTOR", "0");
        vm.setEnv("ROLLBACK_MODULE", vm.toString(address(0)));
        vm.setEnv("PRIVATE_KEY", "0");
        vm.setEnv("ALLOW_AMBIENT_BROADCAST", "false");
        vm.setEnv("SEQUENCER_FEED", vm.toString(address(0)));
        vm.setEnv("ADMIN", vm.toString(address(0)));
        vm.setEnv("TREASURY", vm.toString(address(0)));
        vm.setEnv("WORKER", vm.toString(address(0)));
        vm.setEnv("WORKER_AUTHORITY", vm.toString(address(0)));
        vm.setEnv("PRICE_ORACLE", vm.toString(address(0)));
        vm.setEnv("AAVE_POOL", vm.toString(address(0)));
        vm.setEnv("A_TOKEN", vm.toString(address(0)));
        vm.setEnv("AAVE_POOL_ADDRESS", vm.toString(address(0)));
        vm.setEnv("AAVE_A_TOKEN", vm.toString(address(0)));
        vm.setEnv("REWARDS_CONTROLLER", vm.toString(address(0)));
        vm.setEnv("STATA_TOKEN", vm.toString(address(0)));
        vm.setEnv("OZ_UNSAFE_SKIP_ALL_CHECKS", "0");
    }
}
