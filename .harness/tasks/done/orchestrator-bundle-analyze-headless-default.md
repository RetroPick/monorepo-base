# done — fe-v1 analyze headless default + verify

## Scope

- Confirm `@next/bundle-analyzer` + `pnpm --filter fe-v1 analyze` wiring.
- Default **no** auto-open browser so agents/CI can run analyze safely.
- Run `pnpm verify` and one full analyze build; document report paths.

## Acceptance

- [x] `openAnalyzer` only when `OPEN_ANALYZER=true`
- [x] `pnpm verify` exit 0
- [x] `pnpm --filter fe-v1 analyze` exit 0; reports under `apps/fe-v1/.next/analyze/`

## Owner

orchestrator
