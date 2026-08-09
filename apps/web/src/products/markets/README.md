# Markets web product (PHASE-1 read)

Target-architecture read routes for RetroPick Markets V1. Consumes the Go BFF via `@retropick/polymarket` only (ADR-002).

UI/UX matches fe-v1 prediction-market chrome via the parent `apps/web` Next.js shell (`src/shared/`).

## Routes (IA)

| Path | Page |
|------|------|
| `/markets` | Events discover |
| `/markets/events/:eventId` | Event detail |
| `/markets/m/:marketId` | Market detail + order book (read-only) |
| `/markets/portfolio` | Guest portfolio dashboard shell (fixtures) |

Export `marketsRoutes` from `routes/marketsRoutes.tsx` for shell wiring.

## Development

Run the full app from `apps/web`:

```bash
cd apps/web
pnpm dev          # http://localhost:3001
pnpm test:markets
pnpm typecheck
```

Unit tests only (module):

```bash
cd apps/web
pnpm test:markets
```

Deploy today may still use `apps/fe-v1` until PHASE-6 cutover; this tree is the greenfield target.
