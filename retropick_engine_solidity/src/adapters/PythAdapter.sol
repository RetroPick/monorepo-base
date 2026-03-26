// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {IPyth} from "../vendor/pyth/IPyth.sol";
import {PythStructs} from "../vendor/pyth/PythStructs.sol";
import {OracleNormalize} from "../oracle/OracleNormalize.sol";

/// @title PythAdapter
/// @notice Normalizes Pyth `Price` structs to e8 + confidence, mirroring the Solana program.
contract PythAdapter is IPriceOracle {
    IPyth public immutable pyth;

    constructor(IPyth pyth_) {
        pyth = pyth_;
    }

    /// @inheritdoc IPriceOracle
    function getNormalizedPrice(bytes32 feedId, uint64 maxAgeSeconds, uint64)
        external
        view
        override
        returns (int256 priceE8, uint64 publishTime, uint256 confidenceE8)
    {
        PythStructs.Price memory p = pyth.getPriceNoOlderThan(feedId, uint256(maxAgeSeconds));
        (priceE8, confidenceE8) = OracleNormalize.normalize(p.price, p.conf, p.expo);
        publishTime = uint64(p.publishTime);
    }
}
