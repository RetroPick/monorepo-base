// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MarketEngine} from "../src/MarketEngine.sol";
import {PythAdapter} from "../src/adapters/PythAdapter.sol";
import {IPyth} from "../src/vendor/pyth/IPyth.sol";
import {IERC20} from "@openzeppelin/token/ERC20/IERC20.sol";
import {IPriceOracle} from "../src/interfaces/IPriceOracle.sol";
import {MarketTypes} from "../src/types/MarketTypes.sol";

/// @notice Deploy `PythAdapter` + `MarketEngine`, then call `initializeConfig`.
/// @dev Required env (example):
///   STAKE_TOKEN, PYTH, ADMIN, TREASURY, WORKER,
///   DEFAULT_SETTLEMENT_FEE_BPS, MAX_SWITCH_FEE_BPS, MAX_OUTCOMES,
///   ORACLE_MAX_DELAY_SECONDS, ORACLE_MAX_CONFIDENCE_BPS
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        address stakeToken = vm.envAddress("STAKE_TOKEN");
        IPyth pyth = IPyth(vm.envAddress("PYTH"));
        address admin = vm.envAddress("ADMIN");
        address treasury = vm.envAddress("TREASURY");
        address worker = vm.envAddress("WORKER");

        uint16 defFee = uint16(vm.envUint("DEFAULT_SETTLEMENT_FEE_BPS"));
        uint16 maxSw = uint16(vm.envUint("MAX_SWITCH_FEE_BPS"));
        uint8 maxOut = uint8(vm.envUint("MAX_OUTCOMES"));
        uint64 delay = uint64(vm.envUint("ORACLE_MAX_DELAY_SECONDS"));
        uint16 conf = uint16(vm.envUint("ORACLE_MAX_CONFIDENCE_BPS"));

        PythAdapter adapter = new PythAdapter(pyth);
        MarketEngine engine = new MarketEngine();
        engine.initializeConfig(
            IERC20(stakeToken),
            IPriceOracle(address(adapter)),
            admin,
            treasury,
            worker,
            defFee,
            maxSw,
            maxOut,
            MarketTypes.OracleKind.Pyth,
            delay,
            conf
        );

        console2.log("PythAdapter", address(adapter));
        console2.log("MarketEngine", address(engine));

        vm.stopBroadcast();
    }
}
