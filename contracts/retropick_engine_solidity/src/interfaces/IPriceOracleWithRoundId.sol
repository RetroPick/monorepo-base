// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Optional extension for `IPriceOracle` implementations that can expose oracle round IDs.
/// @dev Intended for Chainlink `AggregatorV3Interface` adapters. Engines should treat this interface as optional
///      and fall back to `IPriceOracle.getNormalizedPrice` when not implemented.
interface IPriceOracleWithRoundId {
    function getNormalizedPriceWithRoundId(bytes32 feedId, uint64 maxAgeSeconds, uint64 nowTs)
        external
        view
        returns (uint80 roundId, int256 priceE8, uint64 publishTime, uint256 confidenceE8);
}

