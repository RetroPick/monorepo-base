# MKT-P2-005 — Session and auth middleware

**Task:** MKT-P2-005  
**Agent:** Chat N  
**Date:** 2026-08-09  
**Status:** **done**

## Summary

Shipped Markets V1 SIWE session auth at `apps/backend/internal/markets/auth/` with HttpOnly JWT cookie, server-issued nonces, chi middleware reusing the fail-closed `eligibility.Evaluator`, and `AccountContext` injection into `GET /markets/eligibility`. No key custody; no order submit.

## Endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/v1/markets/auth/nonce` | Public (rate-limited 10/min/IP) |
| `POST` | `/api/v1/markets/auth/siwe` | Public (rate-limited) |
| `GET` | `/api/v1/markets/auth/session` | Session cookie |
| `POST` | `/api/v1/markets/auth/logout` | Session + CSRF |
| `GET` | `/api/v1/markets/eligibility` | Optional session (AccountContext injected when present) |
| `/api/v1/markets/me/*` | Subgroup | RequireAuthenticated + RequireEligible (empty until P2-003) |

## BLK-001

Default deployment keeps `eligibility.DefaultEvaluator()` unwired — `RequireEligible` and authenticated eligibility still return `eligible: false` (`geo_unknown` / `geoblock_upstream_unavailable`). No allow-all stub.

## Verification

```bash
cd apps/backend && go test ./internal/markets/auth/... ./internal/markets/...
```

Output: [MKT-P2-005-test-output.txt](./MKT-P2-005-test-output.txt) — all packages `ok`.

| Check | Result |
|-------|--------|
| SIWE + cookie round-trip | Pass |
| Nonce replay rejected | Pass |
| RequireEligible fail-closed (default evaluator) | Pass |
| Suspended account → ELIGIBILITY_DENIED | Pass |
| No privateKey in auth package | Pass (manual grep) |

## Changed paths

- `apps/backend/internal/markets/auth/**` (new)
- `apps/backend/internal/markets/router.go`
- `apps/backend/internal/markets/handler.go`
- `apps/backend/internal/markets/handler_test.go`
- `apps/backend/internal/markets/openapi_*_test.go`
- `apps/backend/cmd/markets-api/main.go`
- `apps/backend/cmd/api/main.go`
- `apps/backend/go.mod`, `apps/backend/go.sum`
- `.dev/markets-v1/backend/AUTH_SESSION_AND_ELIGIBILITY.md` (§3/§5/§6, §4.2 typo)

## Handoff

### MKT-P2-003 — Account wallet discovery

- Mount `GET /api/v1/markets/me/wallets` inside `/api/v1/markets/me` subgroup in `router.go`
- Read signer from `auth.SessionFromContext(r.Context())`
- Do not duplicate eligibility logic

### Web — SIWE client completion

Update `apps/web/src/products/markets/wallet/hooks/useMarketsWalletSession.ts`:

1. `GET ${apiOrigin}/api/v1/markets/auth/nonce` → use returned `nonce` in `SiweMessage`
2. `POST /api/v1/markets/auth/siwe` (already stubbed path)
3. On wallet connect, probe `GET /api/v1/markets/auth/session` for session restore

**Env:** `NEXT_PUBLIC_API_BASE_URL`, `MARKETS_CORS_ALLOWED_ORIGINS=http://localhost:3001` on BFF.

### Deferred

- Refresh token rotation (30d)
- Step-up TTL (5m)
- Postgres `users` / `sessions` tables
- Redis eligibility cache in middleware
