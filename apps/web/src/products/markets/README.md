# Markets web product (PHASE-1 read)

Target-architecture read routes for RetroPick Markets V1. Consumes the Go BFF via `@retropick/polymarket` only (ADR-002).

## Routes (IA)

| Path | Page |
|------|------|
| `/markets` | Events discover |
| `/markets/events/:eventId` | Event detail |
| `/markets/m/:marketId` | Market detail + order book (read-only) |

Export `marketsRoutes` from `routes/marketsRoutes.tsx` for PHASE-6 App Router / shell wiring.

Deploy today remains `apps/fe-v1` until PHASE-6 migration.

## Development

Run from `apps/fe-v1` (hoisted deps; module is not a pnpm workspace package yet):

```bash
cd apps/fe-v1
pnpm exec vitest run --config ../web/src/products/markets/vitest.config.ts
pnpm exec tsc --noEmit -p ../web/src/products/markets/tsconfig.json
```

