// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "./PythStructs.sol";
import "./IPythEvents.sol";

/// @dev Minimal IPyth surface required by RetroPick (full upstream file has more methods).
interface IPyth is IPythEvents {
    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (PythStructs.Price memory price);
}
