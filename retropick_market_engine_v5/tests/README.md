# Integration tests

This directory contains the local-validator integration harness for the Pyth-first RetroPick market engine.

The live oracle tests use the official Pyth Solana pull-oracle flow:

- fetch updates from Hermes with `@pythnetwork/hermes-client`
- post `PriceUpdateV2` accounts with `@pythnetwork/pyth-solana-receiver`
- consume those posted accounts in `lock_epoch` / `resolve_epoch`

Official docs used for this harness:

- https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana

## Recommended local stack

- Anchor CLI 0.31.1
- `@coral-xyz/anchor` matching the local Anchor line
- `@pythnetwork/hermes-client`
- `@pythnetwork/pyth-solana-receiver`

## Scenarios

- `market_lifecycle.cjs`: live `open -> deposit -> lock -> resolve -> claim -> withdraw fees` flow using posted `PriceUpdateV2`
- `pyth_stale_flow.cjs`: live stale-oracle rejection using posted `PriceUpdateV2`
- `pyth_confidence_flow.cjs`: live confidence-width rejection using posted `PriceUpdateV2`
- `pyth_direction_flow.ts`: lock + resolve on direction market
- `pyth_threshold_flow.ts`: resolve threshold market
- `fees_and_claims.ts`: switch fees, settlement fees, claim/refund behavior
- `single_side_mode.ts`: runnable local-validator test for single-side deposit and full-flip behavior

The `.cjs` entrypoints are intentional. Under the current Node 24 + mocha + ts-node toolchain, the CommonJS entrypoints are more stable than the ESM path for the receiver SDK dependency graph.

## Validator bootstrap

The local validator must include the Pyth receiver program, the Wormhole core program, the receiver config/treasury PDAs, and the active guardian-set account. The current active guardian-set index for the BTC/USD feed used here was derived from a real Hermes update and is `5`.

Local bootstrap command:

```bash
solana-test-validator --reset --url devnet \
  --clone-upgradeable-program rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ \
  --clone-upgradeable-program HDwcJBJXjL9FpJ7UBsYBtaDjsBUhuLCUYoz3zr8SWWaQ \
  --clone DaWUKXCyXsnzcvLUyeJRWou8KTn7XtadgTsdhJ6RHS7b \
  --clone 8hQfT7SVhkCrzUSgBq6u2wYEt1sH3xmofZ5ss3YaydZW \
  --clone HTczusLJSAhMJKYrxLjSUUyW7YDsBuyfBG8Tj1KJsgni
```

Then deploy the local program:

```bash
solana program deploy target/deploy/market_engine.so \
  --program-id target/deploy/market_engine-keypair.json \
  --url http://127.0.0.1:8899
```

Then run one suite at a time:

```bash
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=$HOME/.config/solana/id.json pnpm test:market-lifecycle
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=$HOME/.config/solana/id.json pnpm test:pyth-stale
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 ANCHOR_WALLET=$HOME/.config/solana/id.json pnpm test:pyth-confidence
```

The stale/confidence suites should run against fresh validator state because `Config` is a singleton PDA and those tests intentionally require different oracle policy values.
