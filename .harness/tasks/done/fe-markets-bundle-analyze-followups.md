# fe-markets: bundle analyzer follow-ups

## Scope

Run `pnpm --filter fe-v1 analyze`, identify the largest first-load chunks, then narrow imports or add `next/dynamic` splits without hurting UX.

## Acceptance

- [x] Treemap notes (top 3 chunks + proposed fix) recorded in `apps/fe-v1/README.md` or `ORCHESTRATOR.md`.
- [x] At least one measurable bundle reduction or justified no-op (document why).
- [x] `pnpm verify` exit 0.

## Verify

```bash
pnpm --filter fe-v1 analyze
pnpm verify
```

## Owner

`fe-markets`

## Done notes

- Documented top chunk roles + mitigation in `apps/fe-v1/README.md` (Analyzer follow-ups).
- Lazy `OnboardingModal` in `OnboardingContext.tsx` — ~180 KiB smaller summed `ClientApp` webpack files on sample build; onboarding loads async when modal opens.
