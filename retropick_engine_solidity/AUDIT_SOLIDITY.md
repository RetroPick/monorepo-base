# RetroPick MarketEngine (Solidity) — engineer-led review

This document is an **internal design and security review** of the Foundry port in this repository. It is **not** a substitute for an independent professional audit before mainnet deployment with material value.

## Threat model

- **Roles**: `deployer` (one-time `initializeConfig`), `admin`, `workerAuthority`, `treasury`. `admin` and `workerAuthority` can open/lock/resolve/cancel epochs; only `admin` manages templates and pause (user-facing worker paths respect pause); `treasury` or `admin` may withdraw fee reserves.
- **Oracle**: The engine trusts `IPriceOracle` to return Pyth-normalized **e8** prices with publishing times consistent with the on-chain clock. A malicious or buggy oracle adapter can mis-resolve markets. Checkpoint **confidence** is stored as **uint128**; values above `type(uint128).max` revert with `ConfidenceOverflow()` (unexpected for normalized Pyth e8 confidence).
- **Token**: The implementation uses **standard `ERC20`** (`transfer` / `transferFrom`). **Fee-on-transfer and rebasing tokens are not supported** without additional balance reconciliation.
- **Framing / ordering**: `initializeConfig` is gated by `deployer`. If deployment and initialization are separate public transactions, a frontrunner could theoretically initialize first; **mitigation**: deploy + initialize in one script bundle, private mempool, or a factory that deploys and initializes atomically.

## Behavioral parity (vs Anchor `market_engine` v5)

- Epoch sequencing, deposits, switches (ceil fee), lock with optional checkpoint A for `Direction`, resolve with checkpoint B, void/refund path, cancel, claim with last-winner dust sweep, and per-template vault accounting are intended to match the Rust reference.
- Templates mirror `upsert_template` with `equalPriceVoids` and `feeOnLosingPool` forced **true**.

## Checklist (manual)

- [x] Reentrancy: `nonReentrant` on token-moving paths; external calls after state updates where applicable.
- [x] Integer safety: Solidity 0.8 checked arithmetic; explicit underflow checks in ledger helpers.
- [x] Access control: modifiers aligned with Anchor (`Unauthorized` patterns).
- [x] Pause: User ops (`deposit`, `switch`) and worker ops (`open`, `lock`, `resolve`) honor `globalPaused`; cancel/claim/fee withdraw match Anchor (no pause on cancel/claim/withdraw).
- [x] Oracle: Staleness via Pyth `getPriceNoOlderThan`; confidence versus `|priceE8| * maxConfidenceBps / 10_000`.
- [ ] Economic edge cases: multi-template aggregate ERC20 balance vs. sum of internal vaults should be monitored off-chain; rounding dust is swept on the final winner claim.

## Static analysis (optional CI)

Run locally:

```bash
pip install slither-analyzer
slither . --filter-paths "lib|test|script"  # narrow scope as needed
```

The repository may add a **manual** GitHub Actions workflow (`workflow_dispatch`) for Slither; failing rules should be triaged, not blindly ignored.

## Integration guidance

- Approve the engine **only for intended deposit amounts** (avoid infinite approvals to the market contract).
- Verify **Pyth contract address** and **price feed id** per chain using [Pyth documentation](https://docs.pyth.network/).

## Known limitations

- No upgrade mechanism in v1; a new deployment is required to change core logic.
- `via_ir = true` is enabled in `foundry.toml` to avoid stack-too-deep in `resolveEpoch`; review optimizer settings for production deployments.
