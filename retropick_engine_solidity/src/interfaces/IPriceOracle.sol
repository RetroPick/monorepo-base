// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Chain-agnostic normalized oracle surface for the market engine.
/// @dev `nowTs` is ignored by on-chain Pyth adapters (they use `block.timestamp` via Pyth).
///      Mocks may use it in tests.
interface IPriceOracle {
    function getNormalizedPrice(bytes32 feedId, uint64 maxAgeSeconds, uint64 nowTs)
        external
        view
        returns (int256 priceE8, uint64 publishTime, uint256 confidenceE8);
}
