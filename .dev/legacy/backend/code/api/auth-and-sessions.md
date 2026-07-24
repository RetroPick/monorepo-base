# API auth and sessions

This doc explains how the backend identifies the caller (“principal”) and how wallet-scoped and operator-scoped access checks work.

## Principal extraction

Source: `apps/backend/internal/api/authn.go`

`PrincipalFromRequest(r, jwtSecret)` resolves in this order:

1. **Cookie session**: if `parseSessionFromRequest(r)` returns a session, the principal is:\n   - `Wallet = session.Wallet`\n   - `IsOperator = false`
2. **Bearer JWT**: if there is `Authorization: Bearer <token>` and `jwtSecret` is set:\n   - token must be **HS256**\n   - `sub` must be a `0x` address (length 42)\n   - operator is inferred via either:\n     - string claim `role == \"operator\"`\n     - or boolean claim `isOperator == true`

If both session and bearer are present, **session wins**.

## Operator enforcement

Source: `internal/api/authn.go`

`RequireOperator(next, jwtSecret)`:\n\n- extracts principal\n- returns `401` if unauthenticated\n- returns `403` if authenticated but not operator\n\nIn `cmd/api/main.go`, `/api/v1/ops/*` is wrapped by this middleware.

## Wallet-scoped authorization

Common patterns:

- **Direct wallet match**: `WalletAuthorized(r, wallet, jwtSecret)`\n  - used for endpoints like `GET /api/v1/user/{address}/events`
- **Ownership by DB record**:\n  - websocket `deposit:{intentId}` channels query `funding_intents.user_address`\n  - funding intent/execution endpoints validate that the caller matches the owner wallet

## Session mechanics (high-level)

Session helpers live in:

- `internal/api/auth_session.go`
- `internal/api/auth_routes.go`

The API injects an `AuthConfig` into request context in `cmd/api/main.go`:\n\n- `JWTSecret`\n- `SessionSecret`\n- TTL values (session TTL, nonce TTL)\n- cookie domain/secure/samesite\n\nHandlers access config via request context.

## Trust boundary notes

- CORS policy is not a security boundary by itself; it is a browser origin control.
- If `AUTH_JWT_SECRET` is empty, Bearer auth is effectively disabled (calls will fail as unauthenticated).
- Operator is purely a JWT/session claim concept; ensure issuance of operator tokens is tightly controlled.

## Source pointers

- `apps/backend/internal/api/authn.go`
- `apps/backend/internal/api/auth_session.go`
- `apps/backend/internal/api/auth_routes.go`
- `apps/backend/cmd/api/main.go` (auth config injection)

