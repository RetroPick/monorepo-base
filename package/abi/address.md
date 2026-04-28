# Base Sepolia deployment addresses (chain id 84532)

Explorer:
- Basescan: <https://sepolia.basescan.org/>
- Blockscout: <https://base-sepolia.blockscout.com/>

Deployment source of truth:
- `broadcast/DeployTestnet.s.sol/84532/run-latest.json`

User-facing MarketEngine:
- Proxy (`ERC1967Proxy`): `0x1ed89defc8fbcbd512c562b148868ffdc778018a`
- Blockscout: <https://base-sepolia.blockscout.com/address/0x1ed89defc8fbcbd512c562b148868ffdc778018a>
- Implementation (`MarketEngineDispatcher`): `0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xf8b69b881fb35feb804cfec761fdeb88c4e45ef1>

Faucet and test token:
- TokenFaucet: `0xf6c1b6bddd06972f08772de7954432e10c853231`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xf6c1b6bddd06972f08772de7954432e10c853231>
- MockERC20 stake token: `0xb7f49377af6adbef64f513cf04dbdac9d0af01b1`
- MockERC20 stake token symbol: `mSTK`
- MockERC20 stake token decimals: `18`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xb7f49377af6adbef64f513cf04dbdac9d0af01b1>

Oracle adapters:
- Price oracle / ChainlinkAdapter: `0x682b79d6cbd8bcb4e89aeac487ee94e2c306175e`
- Blockscout: <https://base-sepolia.blockscout.com/address/0x682b79d6cbd8bcb4e89aeac487ee94e2c306175e>
- RateAdapter: `0x5b61b033816d710e6da9b659a87fc9c2cef6c145`
- Blockscout: <https://base-sepolia.blockscout.com/address/0x5b61b033816d710e6da9b659a87fc9c2cef6c145>
- SmartDataAdapter: `0x51905ef42a9c794bce5042d1305ab4582eeb3823`
- Blockscout: <https://base-sepolia.blockscout.com/address/0x51905ef42a9c794bce5042d1305ab4582eeb3823>
- MacroAdapter: `0xc2a28f925da7e81d4f66eb006917bdf9a3686f16`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xc2a28f925da7e81d4f66eb006917bdf9a3686f16>
- EquityAdapter: `0x6747e65fa8c81f3e0f472b45a4afba9dbe777bd5`
- Blockscout: <https://base-sepolia.blockscout.com/address/0x6747e65fa8c81f3e0f472b45a4afba9dbe777bd5>

Modules:
- MarketEngineAdminModule: `0x98841ad4483403a55d7af7e28899019db5956238`
- Blockscout: <https://base-sepolia.blockscout.com/address/0x98841ad4483403a55d7af7e28899019db5956238>
- MarketEngineViewModule: `0xec237e5c2821346d3eeb88240dd63e814d42dee9`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xec237e5c2821346d3eeb88240dd63e814d42dee9>
- MarketEngineUserOpsClaimsModule: `0xe052d3986d8409119b2c5253ec70e8e164f146da`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xe052d3986d8409119b2c5253ec70e8e164f146da>
- MarketEngineCoreLifecycleModule: `0xbc80925f712c6a362bd612eee0bbec22dd6eedb6`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xbc80925f712c6a362bd612eee0bbec22dd6eedb6>
- MarketEngineRollingLifecycleModule: `0xe2e7bb0127e74b5761efd7560ba0c950a9d2a8a2`
- Blockscout: <https://base-sepolia.blockscout.com/address/0xe2e7bb0127e74b5761efd7560ba0c950a9d2a8a2>

Explorer links:
- Proxy on Basescan: <https://sepolia.basescan.org/address/0x1ed89defc8fbcbd512c562b148868ffdc778018a>
- Proxy on Blockscout: <https://base-sepolia.blockscout.com/address/0x1ed89defc8fbcbd512c562b148868ffdc778018a>
- Faucet on Basescan: <https://sepolia.basescan.org/address/0xf6c1b6bddd06972f08772de7954432e10c853231>
- Faucet on Blockscout: <https://base-sepolia.blockscout.com/address/0xf6c1b6bddd06972f08772de7954432e10c853231>

Notes:
- The proxy is the address to use for MarketEngine interactions.
- The five adapter addresses above are labeled by deployment order from `DeployTestnet.s.sol`, because the broadcast artifact recorded the first five adapter creates under the same contract name.
