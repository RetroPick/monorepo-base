// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {UnsafeUpgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {MarketEngine} from "../src/MarketEngine.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {MockPriceOracle} from "../test/mocks/MockPriceOracle.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPriceOracle} from "../src/interfaces/IPriceOracle.sol";
import {MarketTypes} from "../src/types/MarketTypes.sol";

/// @dev Local / CI: mock token + oracle + UUPS `MarketEngine` proxy with `initialize` (no `--ffi`).
contract DeployLocal is Script {
    function run() external {
        uint256 pk =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        vm.startBroadcast(pk);

        MockERC20 token = new MockERC20();
        MockPriceOracle oracle = new MockPriceOracle();
        MarketEngine impl = new MarketEngine();

        address admin = vm.addr(pk);
        bytes memory initData = abi.encodeCall(
            MarketEngine.initialize,
            (
                IERC20(address(token)),
                IPriceOracle(address(oracle)),
                admin,
                admin,
                admin,
                100,
                500,
                8,
                MarketTypes.OracleKind.Chainlink,
                3600,
                10_000
            )
        );
        address proxy = UnsafeUpgrades.deployUUPSProxy(address(impl), initData);

        console2.log("MockERC20", address(token));
        console2.log("MockPriceOracle", address(oracle));
        console2.log("MarketEngine proxy", proxy);
        console2.log("MarketEngine implementation", address(impl));

        vm.stopBroadcast();
    }
}
