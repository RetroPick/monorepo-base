// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MockERC20} from "../MockERC20.sol";

/// @notice Testnet-only faucet for demo tokens (rate-limited per address).
/// @dev Deploy on testnet only. This contract is NOT intended for mainnet.
contract TokenFaucet {
    error Cooldown(uint64 nextAt);
    error AmountTooLarge(uint256 amount, uint256 maxAmount);
    error ZeroAmount();

    struct FaucetConfig {
        uint64 cooldownSeconds;
        uint256 maxMintAmount;
    }

    FaucetConfig public config;

    MockERC20 public immutable token;

    mapping(address => uint64) public lastMintAt;

    event Minted(address indexed to, uint256 amount);

    constructor(string memory name, string memory symbol, FaucetConfig memory cfg) {
        config = cfg;
        token = new MockERC20(name, symbol, 0, address(this));
    }

    function request(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        FaucetConfig memory cfg = config;
        if (amount > cfg.maxMintAmount) revert AmountTooLarge(amount, cfg.maxMintAmount);

        uint64 nowTs = uint64(block.timestamp);
        uint64 prev = lastMintAt[msg.sender];
        if (prev != 0) {
            uint64 nextAt = prev + cfg.cooldownSeconds;
            if (nowTs < nextAt) revert Cooldown(nextAt);
        }

        lastMintAt[msg.sender] = nowTs;
        token.mintTo(msg.sender, amount);
        emit Minted(msg.sender, amount);
    }
}

