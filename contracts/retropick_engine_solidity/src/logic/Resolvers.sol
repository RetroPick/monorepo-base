// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MarketTypes} from "../types/MarketTypes.sol";

library Resolvers {
    error InvalidEpochState();
    error InvalidTemplate();

    /// @return voided When true, treat as refund mode (no winning side).
    /// @return mask Bitmask of winning outcomes (Rust `1u64 << idx`); undefined if voided.
    function resolveDirection(
        MarketTypes.OracleCheckpoint memory a,
        MarketTypes.OracleCheckpoint memory b,
        bool voidOnEqual
    ) internal pure returns (bool voided, uint256 mask) {
        if (!a.written || !b.written) revert InvalidEpochState();
        if (b.valueE8 > a.valueE8) return (false, uint256(1) << 0);
        if (b.valueE8 < a.valueE8) return (false, uint256(1) << 1);
        if (voidOnEqual) return (true, 0);
        return (false, uint256(1) << 1);
    }

    function resolveThreshold(
        MarketTypes.Condition condition,
        int256 thresholdValueE8,
        MarketTypes.OracleCheckpoint memory b
    ) internal pure returns (uint256 mask) {
        if (!b.written) revert InvalidEpochState();
        bool yes =
            condition == MarketTypes.Condition.AtOrAbove ? b.valueE8 >= thresholdValueE8 : b.valueE8 < thresholdValueE8;
        return yes ? (uint256(1) << 0) : (uint256(1) << 1);
    }

    function resolveRangeClose(
        MarketTypes.OracleCheckpoint memory b,
        uint8 outcomeCount,
        int256[7] memory rangeBoundsE8
    ) internal pure returns (uint256 mask) {
        if (!b.written) revert InvalidEpochState();
        if (outcomeCount < 2) revert InvalidTemplate();
        int256 value = b.valueE8;
        uint256 idx;
        if (value < rangeBoundsE8[0]) {
            idx = 0;
        } else {
            idx = uint256(outcomeCount) - 1;
            for (uint256 i = 1; i < uint256(outcomeCount) - 1; i++) {
                if (value < rangeBoundsE8[i]) {
                    idx = i;
                    break;
                }
            }
        }
        return uint256(1) << idx;
    }
}
