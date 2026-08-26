# RetroPick monorepo architecture (Markets V1)

## Active product path

```text
Polymarket (Gamma / CLOB / WS)
        ↓
packages/polymarket (TS client types + helpers)
        ↓
Go Markets BFF — apps/backend/cmd/markets-api
        ↓
Postgres projections (markets_* tables)
        ↓
schemas/openapi/markets-v1.yaml (+ asyncapi realtime)
        ↓
apps/web (@retropick/markets-web) + Android (RetroPick-Android)
```

## Layout

| Path | Role |
|------|------|
| `apps/web` | Markets web (Next.js shell + React Router SPA) |
| `apps/backend` | Markets BFF only (`internal/markets`, `cmd/markets-api`) |
| `apps/landing-web` | Marketing / waitlist (separate product surface) |
| `apps/android` | Gitlink to RetroPick-Android |
| `packages/polymarket` | Shared TS client for OpenAPI contract |
| `schemas/openapi/markets-v1.yaml` | Canonical HTTP contract |
| `docker-compose.markets-dev.yml` | Local full stack |
| `contracts/prism/` | Future PRISM (placeholder) |
Current Markets V1 authority: `docs/ARCHITECTURE.md`.

## PRISM

Future structured-outcome product. Placeholder directories only; no active runtime.

Current Markets V1 authority: `docs/ARCHITECTURE.md`.

Current Markets V1 authority: `docs/ARCHITECTURE.md`.

Current Markets V1 authority: `docs/ARCHITECTURE.md`.
