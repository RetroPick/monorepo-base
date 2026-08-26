# Production operations (Markets V1)

Current Markets V1 authority: `AGENTS.md`.

## Markets V1 staging

- Compose: [`docker-compose.markets-staging.yml`](docker-compose.markets-staging.yml)
- Env template: [`.env.production.example`](.env.production.example)
- Smoke: [`scripts/markets-dev-smoke.sh`](scripts/markets-dev-smoke.sh) (local) or [`scripts/smoke-production.sh`](scripts/smoke-production.sh) (wrapper)
- Deploy units: [`deploy/README.md`](deploy/README.md)
