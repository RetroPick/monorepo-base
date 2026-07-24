# API middleware: CORS, rate limits, timeouts

This doc explains the major cross-cutting middleware applied in `cmd/api/main.go` and how it behaves.

## Auth config injection

In `cmd/api/main.go`, the router wraps every request with:

- `api.WithAuthConfig(r, api.AuthConfig{...})`

That configuration is then consumed by auth/session handlers.

## CORS

Source: `apps/backend/internal/api/cors.go`

The API uses `chi/cors` with:

- `AllowOriginFunc: api.BuildCORSAllowOriginFunc()`
- `AllowCredentials: true`
- allowed methods: `GET`, `HEAD`, `OPTIONS`, `POST`

### Strict vs dev behavior

- If `CORS_STRICT=1`:\n  - only a small set of default localhost origins plus:\n    - `CORS_ALLOWED_ORIGINS` (exact origin matches)\n    - `CORS_ALLOWED_ORIGIN_PATTERNS` (glob matches on `scheme://host`)\n- Otherwise:\n  - additionally allows any `http://localhost:*` and `http://127.0.0.1:*` origin\n  - this is to support dev servers on variable ports (e.g. ops UI ports 3001–3030)

## Standard chi middleware

`cmd/api/main.go` applies:

- `middleware.RequestID`
- `middleware.RealIP`
- `middleware.Logger`
- `middleware.Recoverer`
- `middleware.Timeout(60 * time.Second)`

This means request handlers should complete within 60s or they will be canceled.

## Rate limiting (in-memory)

Source: `apps/backend/internal/api/rate_limit.go`

The rate limiter is:\n\n- per-process (in-memory maps)\n- keyed by IP address (by default from `RemoteAddr`, not `X-Forwarded-For`)\n- budgeted by route classification

### Budgets

- `public_get`: 60/min\n- `ws_connect`: 30/min\n- `watchlist_write`: 20/min\n- `funding_write`: 20/min\n- `ops`: 15/min

### Classification

The middleware chooses a budget based on request path/method:\n\n- `/api/v1/ops/*` → ops budget\n- `/ws` → ws_connect\n- watchlist POSTs → watchlist_write\n- funding POSTs (`/api/v1/funding/*` or `/api/funding/*`) → funding_write\n- everything else → public_get

### Important implications

- This limiter does **not** coordinate across multiple replicas.
- It provides basic protection for a single instance but should not be treated as your only perimeter control.

## Source pointers

- `apps/backend/cmd/api/main.go`
- `apps/backend/internal/api/cors.go`
- `apps/backend/internal/api/rate_limit.go`

