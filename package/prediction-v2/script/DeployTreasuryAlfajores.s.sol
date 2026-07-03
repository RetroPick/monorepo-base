// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {FeeRouter} from "../../src/treasury/FeeRouter.sol";
import {TreasuryVault} from "../../src/treasury/TreasuryVault.sol";
import {RewardsVault} from "../../src/treasury/RewardsVault.sol";
import {CommunityPool} from "../../src/treasury/CommunityPool.sol";

/// @notice Deploy treasury stack for Celo Alfajores (or any EVM testnet).
/// @dev Required env: MARKET_ENGINE_PROXY. Optional: DEPLOYER (defaults to broadcaster).
///      After broadcast, update packages/contracts/registry.celo-alfajores.json.
contract DeployTreasuryAlfajores is Script {
    function run() external {
        address marketEngine = vm.envAddress("MARKET_ENGINE_PROXY");
        address owner = vm.envOr("TREASURY_OWNER", msg.sender);

        vm.startBroadcast();
        TreasuryVault treasury = new TreasuryVault(owner);
        RewardsVault rewards = new RewardsVault(owner);
        CommunityPool community = new CommunityPool(owner);
        FeeRouter router = new FeeRouter(owner, marketEngine, address(treasury), address(rewards), address(community));
        vm.stopBroadcast();

        console2.log("TreasuryVault", address(treasury));
        console2.log("RewardsVault", address(rewards));
        console2.log("CommunityPool", address(community));
        console2.log("FeeRouter", address(router));
    }
}
