# Monorepo restructure status

**Last updated:** 2026-08-18

## Completed phases

| Phase | Summary | ADR |
|-------|---------|-----|
| R0 | Folder skeleton (`apps/web`, `archive/`, `schemas/`) | [R0](adr/ADR-R0-MONOREPO-PRODUCT-RESTRUCTURE.md) |
| R1 | Legacy quarantine in web products | [R1](adr/ADR-R1-LEGACY-QUARANTINE.md) |
| R2 | Markets BFF + OpenAPI stub | [R2](adr/ADR-R2-MARKETS-BFF-STUB.md) |
| R3 | Legacy API path migration + Gamma catalog | [R3](adr/ADR-R3-LEGACY-API-AND-GAMMA-CATALOG.md) |
| R4 | Epoch code archived | [R4](adr/ADR-R4-LEGACY-ARCHIVED.md) |
| R5 | Live backend Markets-only (`cmd/markets-api`) | [R5](adr/ADR-R5-MARKETS-ONLY-BACKEND.md) |
| R6 | Post-R5 repo hygiene (compose, docs, packages) | This cleanup |

## Active entrypoints

```bash
pnpm dev:markets-stack          # docker-compose.markets-dev.yml
pnpm dev:web                    # apps/web on :3001
go -C apps/backend run ./cmd/markets-api
```

## Key paths

- Architecture: [ARCHITECTURE.md](../ARCHITECTURE.md)
- Markets spec: [`.dev/markets-v1/`](../../.dev/markets-v1/)
- OpenAPI: [schemas/openapi/markets-v1.yaml](../../schemas/openapi/markets-v1.yaml)
- Epoch reference: [archive/](../../archive/)

Historical migration notes: [archive/docs/engineering/](../../archive/docs/engineering/).
