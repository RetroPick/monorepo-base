# MKT-P2-006 — Live CLOB venue balance read — Evidence

**Date:** 2026-08-09  
**Agent:** Chat L2  
**Task:** MKT-P2-006 L2 venue client  
**Depends on:** G2 mount (eligible `/me/balances`); G3 linked wallet via `wallet.Discoverer`

## Summary

Live `ClobVenueSource` at `apps/backend/internal/markets/balances/` reads tradable pUSD collateral via CLOB V2 `GET /balance-allowance?asset_type=COLLATERAL` with server-held L2 HMAC credentials. Resolves primary `accountWallet` + `walletType` from wallet discovery, maps wei to fixed-point `MoneyAmount` (6 decimals). Unwired L2 store, timeout, or upstream failure → **502** `upstream_unavailable` — never invents balances.

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/balances/... -count=1 -v` | Pass (20 tests) — see [MKT-P2-006-venue-test-output.txt](./MKT-P2-006-venue-test-output.txt) |

## Test matrix

| Test | Proves |
|------|--------|
| `TestBuildL2Signature_KnownVector` | L2 HMAC matches Polymarket algorithm |
| `TestSignatureTypeForWallet` | walletType → CLOB signature_type mapping |
| `TestClobVenueSource_CollateralOK` | httptest CLOB → correct MoneyAmount + provenance |
| `TestClobVenueSource_L2Unwired` | UnwiredL2CredentialStore → ErrUpstreamUnavailable |
| `TestClobVenueSource_UpstreamTimeout` | Short timeout → 502 path |
| `TestClobVenueSource_Upstream5xx` | CLOB 503 → 502 |
| `TestClobVenueSource_InvalidPayload` | Negative balance wei → 502 |
| `TestProductionHandlerConfig_EndToEnd` | Reader + ClobVenueSource + MemoryStore → HTTP 200 |
| `TestListMyBalances_*` (existing) | 401/404/502/stub/JSON contract preserved |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/balances/venue.go` | `VenueBalanceRequest`; interface signature |
| `apps/backend/internal/markets/balances/primary.go` | `PrimaryLinkedWallet` |
| `apps/backend/internal/markets/balances/reader.go` | Pass session + walletType to venue |
| `apps/backend/internal/markets/balances/credentials.go` | `L2CredentialStore`, unwired/static stores |
| `apps/backend/internal/markets/balances/clob_l2.go` | L2 HMAC header builder |
| `apps/backend/internal/markets/balances/clob_balance_client.go` | GET /balance-allowance client |
| `apps/backend/internal/markets/balances/clob_venue.go` | `ClobVenueSource` |
| `apps/backend/internal/markets/balances/factory.go` | `NewProductionHandlerConfig` |
| `apps/backend/internal/markets/balances/*_test.go` | Venue + L2 tests |
| `.dev/markets-v1/polymarket/FUNDS_DEPOSIT_AND_WITHDRAWAL.md` | §6.7 balance-read |

## Handoff — G3 main wiring

Replace session-only registration in `cmd/markets-api/main.go` (and `cmd/api/main.go` if applicable):

```go
store := wallet.NewPostgresAccountStore(pool)
disc := wallet.NewDiscoverer(store, marketsMetrics)
balances.RegisterRoutes(r, balances.NewProductionHandlerConfig(balances.ProductionConfig{
    Discoverer: disc,
    CLOBURL:    cfg.CLOBAPIURL,
    L2Store:    balances.UnwiredL2CredentialStore{}, // swap when L2 auth persistence lands
}))
```

Until `L2Store` is wired, linked wallets receive **502** (correct fail-closed behavior).

## Explicit non-goals

- No `POST /balance-allowance/update`
- No deposit create, bridge, wrap, or orders
- No L1 CLOB auth implementation in this task

## Sign-off

- [x] Acceptance criteria met
- [x] `go test ./internal/markets/balances/...` pass
- [x] No secrets in artifact
