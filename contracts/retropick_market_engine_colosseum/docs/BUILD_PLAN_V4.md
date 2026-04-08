# Build plan v4

1. `cargo test --manifest-path programs/market_engine/Cargo.toml`
2. Add local validator integration tests for posted Pyth update accounts
3. Add worker scripts using `@pythnetwork/hermes-client` + `@pythnetwork/pyth-solana-receiver`
4. Fuzz test switching, settlement, and refund invariants
5. Run compile-clean pass with your exact Anchor/AVM/Solana versions
