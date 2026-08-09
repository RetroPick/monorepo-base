# MKT-P2-GLUE — Postgres Wallet Store + Router Wiring — Evidence

**Date:** 2026-08-09  
**Agent:** Chat G3  
**Task:** MKT-P2-GLUE (Postgres wallet router wiring)  
**Status:** **done**

## Summary

Production Markets binaries now wire `PostgresAccountStore` into wallet HTTP routes when a DB pool is available:

- `GET /api/v1/markets/me/wallets` — reads linked rows from `markets_wallet_accounts`
- `POST /api/v1/markets/me/wallets/link` — persists connect-existing linkage (no 503 when pool wired)
- `POST /api/v1/markets/account-wallet/preview` — auth-only sandbox metadata (no relayer HTTP)
- `POST /api/v1/markets/account-wallet/relay` — persists client-supplied deployed Deposit Wallet address

Nil pool / test `RegisterRoutes` callers keep unwired behavior: empty `wallets[]`, link/preview/relay **503**, no invented addresses.

## Auth / eligibility policy

| Route | Middleware | Rationale |
|-------|------------|-----------|
| `GET /me/wallets`, `POST /me/wallets/link` | `OptionalSession` → `RequireAuthenticated` | Account setup before geoblock clears (G2 decision) |
| `POST /account-wallet/preview`, `/relay` | Same auth-only gate | Sandbox deposit-wallet flow; no relayer secrets |
| `GET /me/balances` | Nested `RequireEligible` (unchanged) | Transactional read stays fail-closed |

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/wallet/... ./internal/markets/auth/... ./internal/markets/balances/... -count=1` | **Pass** |
| `go test ./internal/markets/... -count=1` | **Partial** — see [MKT-P2-GLUE-postgres-wallet-test-output.txt](./MKT-P2-GLUE-postgres-wallet-test-output.txt); root `markets` package fails 3 OpenAPI conformance tests (`AccountWalletPreviewRequest` missing from spec — pre-existing, Chat OA scope) |
| `go build ./cmd/api ./cmd/markets-api` | **Blocked** — pre-existing compile error in `internal/markets/service.go` (`os` imported and not used); outside this task's owned paths |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/wallet/wiring.go` | New `HandlerConfigFromPool(pool)` |
| `apps/backend/internal/markets/router.go` | `RouteDeps`, `RegisterRoutesWithDeps`, `/account-wallet` mount |
| `apps/backend/cmd/markets-api/main.go` | Pool-derived wallet config + shared discoverer for balances |
| `apps/backend/cmd/api/main.go` | Same |

## Wiring flow

```text
pool → PostgresAccountStore
     → Discoverer (GET /me/wallets)
     → Linker    (POST /me/wallets/link, /account-wallet/preview|relay)
main → balances.Reader shares walletCfg.Discoverer
```

## ADR-003 proofs

- Discovery reads store only; never synthesizes `accountWallet`.
- Relay/link require client-supplied deployed address.
- Session signer from `ContextSessionResolver` / auth JWT only.

## G2 evidence gap (fixed here)

Prior [MKT-P2-GLUE-session-wallet-evidence.md](./MKT-P2-GLUE-session-wallet-evidence.md) stated mains required no changes. Balances were mounted via `EligibleMeRouteRegistrar` but used `DefaultDiscoverer()` (UnwiredStore). Both mains now pass `walletCfg.Discoverer` into `balances.NewReader`, so linked wallets resolve for `GET /me/balances` once a primary wallet exists (venue source still returns **502** until L2 wired).

## Non-blocking gaps

- Wallet discovery metrics use `NopRecorder{}`; `markets.Metrics` has no `RecordDiscovery` yet.
- OpenAPI schemas for account-wallet paths pending Chat OA.

## Handoff

| Consumer | Next step |
|----------|-----------|
| Web funding UX (MKT-P2-004-web) | `POST /account-wallet/preview` + `/relay` now routable when session present |
| L2 venue client | Implement `VenueBalanceSource`; balances will 502 until then |
| Chat OA | Add `AccountWalletPreviewRequest` etc. to OpenAPI to unblock conformance tests |
| Maintainer | Remove unused `os` import in `service.go` to restore `cmd/*` build |
