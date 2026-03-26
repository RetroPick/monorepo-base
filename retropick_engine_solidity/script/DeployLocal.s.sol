// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MarketEngine} from "../src/MarketEngine.sol";
import {MockERC20} from "../test/mocks/MockERC20.sol";
import {MockPriceOracle} from "../test/mocks/MockPriceOracle.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {IPriceOracle} from "../src/interfaces/IPriceOracle.sol";
import {MarketTypes} from "../src/types/MarketTypes.sol";

/// @dev Local / CI: deploy mock token + mock oracle + engine with `initializeConfig`.
contract DeployLocal is Script {
    function run() external {
        uint256 pk =
            vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        vm.startBroadcast(pk);

        MockERC20 token = new MockERC20();
        MockPriceOracle oracle = new MockPriceOracle();
        MarketEngine engine = new MarketEngine();

        address admin = vm.addr(pk);
        engine.initializeConfig(
            IERC20(address(token)),
            IPriceOracle(address(oracle)),
            admin,
            admin,
            admin,
            100,
            500,
            8,
            MarketTypes.OracleKind.Pyth,
            3600,
            10_000
        );

        console2.log("MockERC20", address(token));
        console2.log("MockPriceOracle", address(oracle));
        console2.log("MarketEngine", address(engine));

        vm.stopBroadcast();
    }
}
