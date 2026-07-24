# CI/CD

## Workflows

- `ci.yml`: installs pnpm dependencies, runs lint, typecheck, tests, build, and Go tests.
- `contracts.yml`: runs Foundry build and tests from `contracts/legacy-pool-v1`.

## Production Notes

Production needs persistent services: Postgres, API, indexer, keeper, funding worker, price worker, and realtime. API-only Vercel deployments are non-production experiments.
