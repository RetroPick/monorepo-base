# TrustedReporter Markets

TrustedReporter is the manual oracle path for markets where a scalar Chainlink feed is not enough.

## Supported Uses

| Market type | TrustedReporter support | Notes |
| --- | --- | --- |
| Threshold | Yes | Posts scalar resolve value. |
| RangeClose | Yes | Posts scalar close value. |
| Ladder | Yes | Posts scalar close value. |
| Corridor | Yes | Must post scalar close plus OHLC high/low. |
| Cascade | Yes | Must post scalar close plus OHLC high/low. |
| Direction | No | Needs checkpoint A at lock. |
| Velocity | No | Needs checkpoint A at lock. |
| Convergence | No | Multi-feed Chainlink path only. |
| Composite | No | Multi-feed Chainlink path only. |

TrustedReporter is manual-only. `templateOracleKind=TrustedReporter` with `executionMode=Rolling` reverts.

## Operator Flow

1. Deploy `TrustedReporterAdapter(reporter, owner, maxDelaySeconds)`.
2. Create templates with `templateOracleKind=TrustedReporter`, `oracleFeedId=0x0`, and `eventOracle=<adapter>`.
3. Open and lock epochs normally through keeper/admin flows.
4. Before resolving, the reporter signs and posts:
   - `postResolveResult` for scalar settlement.
   - `postOhlcResult` as well for Corridor/Cascade.
5. Keeper calls `resolveEpoch`.

## Security Model

- The adapter validates EIP-712 signatures from the configured reporter key.
- The backend/reporter service must not hold admin keys. Its only signing authority should be the reporter key.
- Rotate the reporter through adapter ownership if the signer is exposed.
- Use short `maxDelaySeconds` and monitor missed posts; stale or missing reports cause resolve to revert.
- Corridor/Cascade must not use scalar Chainlink templates. The engine rejects those templates because high/low OHLC fields would otherwise be empty.

## Backend Integration

The current backend reporter is a separate disabled-by-default signer:

- `REPORTER_ENABLED=1` is required.
- It signs one EIP-712 claim at a time and writes JSON to stdout.
- It supports `lock`, `resolve`, and `ohlc` claim kinds.
- It does not auto-broadcast transactions.
- Operators must verify adapter `trustedReporter`, nonce, `reporterEpoch`, and source data before posting the signed payload.

A future automated reporter loop can build on this signer by reading pending TrustedReporter epochs from indexed templates/epochs, fetching deterministic source data, posting adapter transactions, and recording source/digest/tx hash/observed timestamp for audit.

Do not let public API callers submit arbitrary reporter payloads to chain. If an operator UI prepares reporter actions, require authenticated operator access, source-data preview, and explicit transaction approval.
