# Markets backend (Polymarket BFF)

Greenfield bounded context for RetroPick Markets. **Not** epoch `internal/legacy/domain/market`.

## Endpoints

| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/markets/eligibility` | Fail-closed stub |
| GET | `/api/v1/markets/capabilities` | `markets-v1-catalog` |
| GET | `/api/v1/markets/events` | Gamma catalog (when enabled) |

Legacy epoch market APIs: `/api/v1/legacy/markets/*`

OpenAPI: `schemas/openapi/markets-v1.yaml`

## Configuration

- `MARKETS_GAMMA_API_URL` (default `https://gamma-api.polymarket.com`)
- `MARKETS_CATALOG_ENABLED` (default `1`; set `0` for empty stub catalog)
