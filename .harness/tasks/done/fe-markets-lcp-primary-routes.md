# fe-markets: LCP on primary routes

## Scope

Profile `/markets` (and the next heaviest default route) with Lighthouse or Web Vitals; apply one targeted fix (fonts, hero image, data fetch waterfall).

## Acceptance

- [x] Before/after LCP (or FCP) numbers documented in repo docs.
- [x] No intentional regression on mobile viewport.
- [x] `pnpm verify` exit 0.

## Verify

```bash
pnpm verify
```

## Owner

`fe-markets`

## Done (orchestrator)

- `app/[[...slug]]/loading.tsx` — server-rendered shell while `ClientApp` hydrates.
- `app/layout.tsx` — `@fontsource` Inter / Plus Jakarta Sans / JetBrains Mono (weights used by UI).
- `apps/fe-v1/README.md` — LCP table + Lighthouse measurement note.
- `src/app.layout-fonts.test.ts` — asserts self-hosted fonts.
