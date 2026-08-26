# CI/CD

## Workflows

- [`ci.yml`](../../.github/workflows/ci.yml): pnpm lint, typecheck, tests, build; Go build/test; Markets OpenAPI/AsyncAPI drift; [`scripts/check-active-legacy-refs.sh`](../../scripts/check-active-legacy-refs.sh); migration-markets job (Postgres).
Current Markets V1 authority: `docs/ARCHITECTURE.md`.

## Production Notes

Markets V1 production stack: Postgres + `markets-api` + `apps/web` (see [`docker-compose.production.yml`](../../docker-compose.production.yml) and [`PRODUCTION.md`](../../PRODUCTION.md)).

Current Markets V1 authority: `docs/ARCHITECTURE.md`.
