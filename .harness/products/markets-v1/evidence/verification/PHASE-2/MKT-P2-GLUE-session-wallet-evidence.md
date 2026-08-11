# MKT-P2-GLUE — Auth ↔ Wallet Session Wiring — Evidence

**Date:** 2026-08-09  
**Agent:** Chat G  
**Task:** MKT-P2-GLUE  
**Status:** **done**

## Summary

Wired P2-005 JWT session context into P2-003 wallet discovery:

- `wallet.ContextSessionResolver` reads `auth.SessionFromContext` (no cookie re-parse, no client identity headers).
- `GET /api/v1/markets/me/wallets` mounted under `/me` with **`RequireAuthenticated` only** (not `RequireEligible`) so SIWE-authenticated users receive **200** with empty `wallets[]` while BLK-001 geoblock remains unwired.
- Unauthenticated requests return **401** `UNAUTHENTICATED` from auth middleware before the wallet handler runs.

## Gate decision (AUTH §5 deviation)

| Route | Middleware | Rationale |
|-------|------------|-----------|
| `GET /me/wallets` | `OptionalSession` → `RequireAuthenticated` | Account setup / disclosure after SIWE; must work before geoblock clears |
| Future trading/balance routes | Add nested `RequireEligible` | Transactional gates remain fail-closed per BLK-001 |

**Follow-up:** docs-curator should split AUTH §5 wording (`/me/wallets` auth-only vs transactional `/me/*` eligible-gated).

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/auth/... ./internal/markets/wallet/... -v` | Pass (9 wallet tests incl. 3 glue integration tests) |
| `go test ./internal/markets/...` | Pass — see [MKT-P2-GLUE-test-output.txt](./MKT-P2-GLUE-test-output.txt) |
| `go build ./cmd/api ./cmd/markets-api` | Pass (exit 0) |

## Integration test matrix

| Test | Proves |
|------|--------|
| `TestMeWallets_Unauthenticated` | Full `markets.RegisterRoutes` stack → **401** `UNAUTHENTICATED` |
| `TestMeWallets_AuthenticatedEmptyWallets` | SIWE cookie round-trip → **200**, signer set, `wallets: []` |
| `TestMeWallets_AuthenticatedWithMemoryStore` | Context resolver + memory store → linked account wallet returned |

## Changed paths (glue scope)

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/wallet/context_session.go` | New `ContextSessionResolver` |
| `apps/backend/internal/markets/wallet/auth.go` | Updated resolver doc comment |
| `apps/backend/internal/markets/wallet/handler.go` | Relative route `/wallets` |
| `apps/backend/internal/markets/wallet/discovery_test.go` | Route group mount fix |
| `apps/backend/internal/markets/wallet/glue_test.go` | End-to-end auth ↔ wallet tests |
| `apps/backend/internal/markets/router.go` | Mount wallet under `/me` + auth-only gate |

No changes required to `cmd/api/main.go` or `cmd/markets-api/main.go` (both already pass `authMod` to `markets.RegisterRoutes`).

## Request flow

```text
GET /api/v1/markets/me/wallets
  → OptionalSession (parse mkt_session JWT → context)
  → RequireAuthenticated (401 if missing)
  → wallet.ListMyWallets
  → ContextSessionResolver → Discoverer.ListWallets
  → 200 WalletsListResponse
```

## Handoff — Chat R (MKT-P2-006 balances)

1. Reuse `wallet.ContextSessionResolver` or `auth.SessionFromContext(r.Context())`.
2. Mount balance read under `/me`; nest **`RequireEligible`** when route is transactional.
3. Mock `SessionResolver` in unit tests if glue not merged.

## Handoff — Chat Q-be (Postgres wallet store)

1. Replace `wallet.UnwiredStore` / `DefaultDiscoverer()` with Postgres `AccountStore` on `markets.wallet_accounts`.
2. Key rows by `UserID|SignerAddress` (see `MemoryStore` pattern in `wallet/discovery_test.go`).
3. No handler changes needed — store swap only.

## BLK-001 honesty

- `/me/wallets` is **not** eligibility-gated (auth-only by design for this glue task).
- Trading/funding routes added later **must** use `RequireEligible`; do not copy auth-only gate.
