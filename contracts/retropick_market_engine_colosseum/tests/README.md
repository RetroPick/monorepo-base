# Integration tests

This directory contains the local-validator integration harness for the Pyth-first RetroPick market engine.

The live oracle tests use the official Pyth Solana pull-oracle flow:

- fetch updates from Hermes with `@pythnetwork/hermes-client`
- post `PriceUpdateV2` accounts with `@pythnetwork/pyth-solana-receiver`
- consume those posted accounts in `lock_epoch` / `resolve_epoch`

Official docs used for this harness:

- https://docs.pyth.network/price-feeds/core/use-real-time-data/pull-integration/solana
- Feed catalog (asset class, exponent, id): https://insights.pyth.network/price-feeds#priceFeeds

## Non-crypto feeds (same program path)

The market engine is **feed-agnostic**: `oracle_feed_id` is any 32-byte Pyth id. On-chain checkpoints store **`value_e8`**, i.e. the Pyth price scaled to a fixed **1e8** integer (see `programs/market_engine/src/oracle/pyth.rs`). Template thresholds and range bounds must be authored in that same **e8** space. Check each feed’s **exponent** on Insights: e.g. equity-style `-5` vs crypto `-8` changes the raw integer magnitude; the program normalizes all supported exponents into `value_e8`.

Example ids (verify on Hermes before production; futures roll over time):

| Asset class | Symbol | Pyth id (hex, no `0x`) |
|-------------|--------|-------------------------|
| Metal | XAU/USD | `765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2` |
| FX | USD/MYR | `6049eac22964b1ac2119e54c98f3caa165817d84273a121ee122fafb664a8094` |
| Commodities | WTI (front contract, e.g. WTIJ6) | `6a60b0d1ea6809b47dbe599f24a71c8bda335aa5c77e503e7260cde5ba2f4694` |

Default integration tests still use BTC/USD. Override with env (see `tests/helpers/pyth.ts`):

- `PYTH_TEST_FEED_ID` — hex feed id (e.g. XAU example id in `EXAMPLE_XAU_USD_FEED_ID`)
- `PYTH_TEST_ASSET_SYMBOL` — label for template `asset_symbol` and slug prefix in `market_lifecycle.cjs`

Per-template oracle staleness/confidence overrides are stored on the template and copied to the epoch (`oracle_max_delay_seconds`, `oracle_max_confidence_bps`; `0` = use global config).

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
