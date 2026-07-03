// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRewardFundingSink {
    function fundRewardDestination(address token, address destination, uint256 amount, bytes32 batchId) external;
}
