# done — fe-v1 analyze headless default + verify

## Scope

- Confirm `@next/bundle-analyzer` + `pnpm --filter web analyze` wiring.
- Default **no** auto-open browser so agents/CI can run analyze safely.
- Run `pnpm verify` and one full analyze build; document report paths.

## Acceptance

- [x] `openAnalyzer` only when `OPEN_ANALYZER=true`
- [x] `pnpm verify` exit 0
- [x] `pnpm --filter web analyze` exit 0; reports under `apps/web/.next/analyze/`

## Owner

orchestrator
