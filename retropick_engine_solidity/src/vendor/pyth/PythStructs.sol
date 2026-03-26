// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @dev Minimal vendored subset from Pyth
/// https://github.com/pyth-network/pyth-crosschain
contract PythStructs {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
}
