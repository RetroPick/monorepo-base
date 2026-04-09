// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";
import {Options} from "openzeppelin-foundry-upgrades/Options.sol";

import {MarketEngine} from "../../src/MarketEngine.sol";
import {ChainlinkAdapter} from "../../src/adapters/ChainlinkAdapter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPriceOracle} from "../../src/interfaces/IPriceOracle.sol";
import {MarketTypes} from "../../src/types/MarketTypes.sol";

/// @notice Production deployment: deploy `ChainlinkAdapter` + UUPS proxy for `MarketEngine` with atomic `initialize`.
/// @dev Run with `--ffi` so OpenZeppelin upgrades validations can run.
/// @dev Use Foundry keystore with `--account`, do not pass raw private keys.
///
/// Required env:
/// - STAKE_TOKEN
/// - SEQUENCER_FEED (use address(0) on L1, Chainlink uptime feed on L2)
/// - ADMIN, TREASURY, WORKER
/// - DEFAULT_SETTLEMENT_FEE_BPS, MAX_SWITCH_FEE_BPS, MAX_OUTCOMES
/// - ORACLE_MAX_DELAY_SECONDS, ORACLE_MAX_CONFIDENCE_BPS
contract DeployProduction is Script {
    function run() external {
        vm.startBroadcast();

        address stakeToken = vm.envAddress("STAKE_TOKEN");
        address sequencerFeed = vm.envAddress("SEQUENCER_FEED");
        address admin = vm.envAddress("ADMIN");
        address treasury = vm.envAddress("TREASURY");
        address worker = vm.envAddress("WORKER");

        uint256 defFeeRaw = vm.envUint("DEFAULT_SETTLEMENT_FEE_BPS");
        uint256 maxSwRaw = vm.envUint("MAX_SWITCH_FEE_BPS");
        uint256 maxOutRaw = vm.envUint("MAX_OUTCOMES");
        uint256 delayRaw = vm.envUint("ORACLE_MAX_DELAY_SECONDS");
        uint256 confRaw = vm.envUint("ORACLE_MAX_CONFIDENCE_BPS");

        require(stakeToken != address(0), "STAKE_TOKEN=0");
        require(admin != address(0), "ADMIN=0");
        require(treasury != address(0), "TREASURY=0");
        require(worker != address(0), "WORKER=0");

        require(defFeeRaw <= 10_000, "DEFAULT_SETTLEMENT_FEE_BPS>10000");
        require(maxSwRaw <= 10_000, "MAX_SWITCH_FEE_BPS>10000");
        require(maxOutRaw <= 8, "MAX_OUTCOMES>8");
        require(delayRaw <= type(uint64).max, "ORACLE_MAX_DELAY_SECONDS overflow");
        require(confRaw <= 10_000, "ORACLE_MAX_CONFIDENCE_BPS>10000");

        // forge-lint: disable-next-line(unsafe-typecast) -- bounded by require(...) checks above
        uint16 defFee = uint16(defFeeRaw);
        // forge-lint: disable-next-line(unsafe-typecast) -- bounded by require(...) checks above
        uint16 maxSw = uint16(maxSwRaw);
        // forge-lint: disable-next-line(unsafe-typecast) -- bounded by require(...) checks above
        uint8 maxOut = uint8(maxOutRaw);
        // forge-lint: disable-next-line(unsafe-typecast) -- bounded by require(...) checks above
        uint64 delay = uint64(delayRaw);
        // forge-lint: disable-next-line(unsafe-typecast) -- bounded by require(...) checks above
        uint16 conf = uint16(confRaw);

        ChainlinkAdapter adapter = new ChainlinkAdapter(sequencerFeed);

        bytes memory initData = abi.encodeCall(
            MarketEngine.initialize,
            (
                IERC20(stakeToken),
                IPriceOracle(address(adapter)),
                admin,
                treasury,
                worker,
                defFee,
                maxSw,
                maxOut,
                MarketTypes.OracleKind.Chainlink,
                delay,
                conf
            )
        );

        Options memory opts;
        address proxy = Upgrades.deployUUPSProxy("MarketEngine.sol:MarketEngine", initData, opts);

        // Lightweight post-deploy verification (still do independent RPC checks per ProductionChecklist).
        MarketEngine engine = MarketEngine(proxy);
        require(engine.configInitialized(), "configInitialized=false");
        require(address(engine.stakeToken()) == stakeToken, "stakeToken mismatch");
        require(address(engine.priceOracle()) == address(adapter), "priceOracle mismatch");
        require(engine.admin() == admin, "admin mismatch");
        require(engine.treasury() == treasury, "treasury mismatch");
        require(engine.workerAuthority() == worker, "worker mismatch");

        console2.log("ChainlinkAdapter", address(adapter));
        console2.log("MarketEngine proxy", proxy);
        console2.log("MarketEngine implementation", Upgrades.getImplementationAddress(proxy));
        console2.log("Admin", admin);
        console2.log("Treasury", treasury);
        console2.log("Worker", worker);

        vm.stopBroadcast();
    }
}

