# fe-markets — lazy default route + Reown/chart import optimization

## Owner

`fe-markets` (orchestrator slice)

## Plan

- Code-split default landing view so first interactive bundle is smaller.
- Extend Next `optimizePackageImports` for wallet/chart packages used on hot paths.

## Build / validate

- `pnpm verify` (root)

## Acceptance

- [x] `MarketsAll` loaded via `React.lazy` in `apps/web/src/App.tsx`.
- [x] `next.config.mjs` includes `@reown/appkit`, `@reown/appkit-pay`, `@reown/appkit-adapter-wagmi`, `lightweight-charts`, `@worldcoin/idkit` in `experimental.optimizePackageImports`.
- [x] `apps/web/README.md` + `ORCHESTRATOR.md` updated.
- [x] `pnpm verify` passes.

## Notes

Hermes Kanban seeding remains manual ([`.harness/docs/kanban-seed-retropick-v1.md`](../../docs/kanban-seed-retropick-v1.md)).
