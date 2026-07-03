// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IMarketEngineFees {
    function withdrawFees(bytes32 templateId, uint256 amount) external;
}
