# MKT-P2-006 — pUSD balance read — Evidence

**Date:** 2026-08-09  
**Agent:** Chat R  
**Task:** MKT-P2-006

## Summary

Balance read module at `apps/backend/internal/markets/balances/` serves `GET /api/v1/markets/me/balances` (`listMyBalances`). Resolves primary `accountWallet` via wallet discovery (P2-003 read-only dependency), returns tradable pUSD as fixed-point `MoneyAmount` (6 decimals, no float). Default deployment returns `401` without session, `404` without linked wallet, `502` when venue source is unwired — never invents balances. OpenAPI phase-2 path and `BalancesListResponse` added.

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/balances/... -count=1 -v` | Pass (12 tests) — see [MKT-P2-006-test-output.txt](./MKT-P2-006-test-output.txt) |
| `go test ./internal/markets/... -count=1` | Pass (all packages) |
| `graphify update .` | Pass |

## Test matrix

| Test | Proves |
|------|--------|
| `TestListMyBalances_Unauthorized` | Default resolver → HTTP 401 |
| `TestListMyBalances_AccountNotLinked` | Stub session + empty wallet store → HTTP 404 `account_not_linked` |
| `TestListMyBalances_UpstreamUnwired` | Linked wallet + unwired venue → HTTP 502 |
| `TestListMyBalances_PrimaryWalletSelection` | `isPrimary` wins over non-primary linked wallet |
| `TestListMyBalances_MoneyAmountFixedPoint` | JSON `amount` string, `currency` pUSD, `decimals` 6; no binary floats |
| `TestListMyBalances_JSONContract` | OpenAPI wire shape with provenance |
| `TestPrimaryAccountWallet` | Primary selection logic |
| `TestParseBaseUnits_*` / `TestCollateralFromWei` | Integer base-unit parsing without float |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/balances/**` | New balance read module |
| `schemas/openapi/markets-v1.yaml` | `listMyBalances`, `BalancesListResponse` |

## OpenAPI claim

- **Path:** `GET /api/v1/markets/me/balances`
- **operationId:** `listMyBalances`
- **Schemas:** `BalancesListResponse` (reuses `MoneyAmount`, `UpstreamProvenance`, `MarketFreshness`)

## Handoff — Router owner

1. Mount `balances.RegisterRoutes(r, balances.HandlerConfig{…})` alongside pending `wallet.RegisterRoutes` in `router.go` or `main.go`.
2. Pass production `SessionResolver` adapter from `auth.SessionFromContext`.

## Handoff — L2 venue client (future)

1. Implement `VenueBalanceSource` calling CLOB V2 collateral balance-allowance read for `accountWallet` with server-held L2 credentials.
2. Until wired, endpoint correctly returns `502 upstream_unavailable` rather than fabricating balances.

## Handoff — Web / funding UX

- Consume `GET /me/balances` after session + linked wallet; handle 404 (needs account setup) and 502 (venue degraded) explicitly.
- Do not use for deposit create — balance read only.

## Sign-off

- [x] Acceptance criteria met
- [x] No secrets in artifact
