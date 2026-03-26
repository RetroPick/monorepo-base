// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Ports `oracle/pyth.rs` normalization to 1e8 fixed-point.
library OracleNormalize {
    error InvalidOraclePrice();
    error MathOverflow();

    function normalize(int64 price, uint64 conf, int32 expo)
        internal
        pure
        returns (int256 valueE8, uint256 confidenceE8)
    {
        if (expo > 0) revert InvalidOraclePrice();

        int256 value = int256(price);
        uint256 confU = uint256(conf);
        uint32 expAbs = uint32(uint256(int256(-int256(expo))));

        if (expAbs < 8) {
            uint256 mul = _pow10(8 - expAbs);
            value = _mulI256U256(value, mul);
            confU = _mulU256(confU, mul);
        } else if (expAbs > 8) {
            uint256 div = _pow10(expAbs - 8);
            value = value / int256(div);
            confU = confU / div;
        }

        valueE8 = value;
        confidenceE8 = confU;
    }

    function _pow10(uint32 e) private pure returns (uint256) {
        return 10 ** uint256(e);
    }

    function _mulI256U256(int256 x, uint256 y) private pure returns (int256) {
        if (x == 0) return 0;
        if (y == 0) return 0;
        int256 r = x * int256(y);
        if (r / int256(y) != x) revert MathOverflow();
        return r;
    }

    function _mulU256(uint256 x, uint256 y) private pure returns (uint256) {
        unchecked {
            uint256 r = x * y;
            if (y != 0 && r / y != x) revert MathOverflow();
            return r;
        }
    }
}
