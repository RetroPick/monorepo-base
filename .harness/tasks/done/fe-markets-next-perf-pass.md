# fe-markets — Next.js perf pass (done)

## Goal

Reduce client bundle weight and production console noise for `fe-v1` without changing product behavior.

## Acceptance

- [x] `next.config.mjs`: production `compiler.removeConsole` (exclude `error`, `warn`).
- [x] `optimizePackageImports` extended for `@tanstack/react-query`, `sonner`, `embla-carousel-react`, `react-day-picker` (plus existing Radix / chart / wallet packages).
- [x] `apps/fe-v1/README.md` documents perf flags + `pnpm analyze`.
- [x] Wagmi / EIP-712 typing fixes so `next build` passes (`useMarketRegistry` passes `chain`; `useYellowSession` uses numeric `chainId`).
- [x] `pnpm verify` green at repo root; `pnpm -C apps/fe-v1 build` succeeds after a clean `.next` if a prior build left artifacts inconsistent.

## Owner

`fe-markets` (orchestrator tracked).
