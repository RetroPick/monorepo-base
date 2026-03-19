# Build plan v4

1. cargo test --manifest-path programs/market_engine/Cargo.toml
2. wire local validator tests for Pyth posted updates
3. add worker scripts using Hermes + pyth-solana-receiver transaction builder
4. fuzz test reserve and switching invariants
5. mainnet only after compile-clean + audit pass
