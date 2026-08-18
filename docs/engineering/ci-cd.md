# CI/CD

## Workflows

- [`ci.yml`](../../.github/workflows/ci.yml): pnpm lint, typecheck, tests, build; Go build/test; Markets OpenAPI/AsyncAPI drift; [`scripts/check-active-legacy-refs.sh`](../../scripts/check-active-legacy-refs.sh); migration-markets job (Postgres).
- [`contracts.yml`](../../.github/workflows/contracts.yml): manual Foundry build/test against `archive/contracts/legacy-pool-v1` (epoch contracts only).

## Production Notes

Markets V1 production stack: Postgres + `markets-api` + `apps/web` (see [`docker-compose.production.yml`](../../docker-compose.production.yml) and [`PRODUCTION.md`](../../PRODUCTION.md)).

Epoch workers (indexer, keeper, funding-worker, price-worker) are **archived** under `archive/apps/backend/cmd/` — not part of the live release.
