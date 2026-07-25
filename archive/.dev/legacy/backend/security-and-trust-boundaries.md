# Security and trust boundaries

This doc captures the important “who can do what?” boundaries in the backend as implemented today.

## Authentication methods

Principal extraction in `apps/backend/internal/api/authn.go` supports:

- **Cookie session** (preferred when present): `parseSessionFromRequest(...)`
- **Bearer JWT**: HS256, with wallet address in `sub` claim

Operator privilege is determined by either:

- `role == "operator"`, or
- boolean claim `isOperator == true`

## Operator routes

Operator-only routes are mounted under:

- `/api/v1/ops/*`

These are wrapped by `api.RequireOperator(...)` in `cmd/api/main.go`.

## Wallet-scoped routes

Several endpoints are wallet-scoped and require that the authenticated principal wallet matches:

- `GET /api/v1/user/{address}/events` (explicit wallet check)
- Funding abstraction surfaces (intent/execution ownership checks)
- Websocket channels:
  - `user:<wallet>`
  - `deposit:<intentId>`

## Trust boundary gotchas (document explicitly in integrations)

- **CORS is not auth**. CORS is an origin policy for browsers. Do not treat it as authorization.
- **Webhooks**: LI.FI webhook auth is optional and enabled only if `LIFI_WEBHOOK_SECRET` is set.
- **In-memory rate limiting**:
  - `internal/api/rate_limit.go` is per-process, per-IP, best-effort.
  - It does not coordinate across multiple replicas and is not a substitute for perimeter controls.
- **Serverless deployment risks**:
  - A serverless API can appear “healthy” while the indexer is stale, because the durable responsibilities (indexer, keeper, websocket stream) require persistence.
  - See `PRODUCTION.md` for the recommended deployment shapes.

## CORS policy modes

`internal/api/cors.go` implements:

- **Strict mode**: `CORS_STRICT=1`, allow only exact origins and host globs.
- **Dev mode**: allows any `http://localhost:*` and `http://127.0.0.1:*` origin so dev servers on arbitrary ports work.

## Websocket origin allowlist

Websocket upgrades require the `Origin` header to be present and match `WS_ALLOWED_ORIGINS`. If you forget to set it, WS connects will fail even if HTTP works.

## Source pointers

- `apps/backend/internal/api/authn.go`
- `apps/backend/internal/api/cors.go`
- `apps/backend/internal/api/rate_limit.go`
- `apps/backend/cmd/api/main.go` (router mounting and websocket channel authorization)

