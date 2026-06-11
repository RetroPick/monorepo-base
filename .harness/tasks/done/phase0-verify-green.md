---
title: Phase 0 — monorepo verify green
status: done
owner: qa-integration
---

## Goal

Baseline lint, tests, and Go compile for RetroPick root workspace.

## Acceptance

- [x] `pnpm lint` passes
- [x] `pnpm test` passes (packages that define tests)
- [x] `pnpm smoke` passes (`go test ./...` under `apps/backend`)
- [x] `git submodule status` shows `package/prediction-v2` initialized when contract work is planned — verified 2026-05-26 (`package/prediction-v2` at commit on `heads/main`)

## Notes (2026-05-26)

- `apps/docs`: ESLint now ignores `.next/**` and `next-env.d.ts` (generated / Next triple-slash).
- `apps/ops`: added `eslint-plugin-import` so `eslint-config-next` loads under pnpm.
- **`apps/fe-v1`:** ESLint ignores `.next/**` and mirror `sources/**` (canonical code under `src/`). Fixed real errors (`no-explicit-any`, conditional `useAccount`, shadcn empty interfaces, `tailwind.config` `require`, integration test `fetch` mock typing). **27 warnings** remain (react-refresh / exhaustive-deps — non-blocking).
- Root `package.json` includes **`pnpm verify`** → `lint && test && smoke` (matches manifest).

## Verify

```bash
pnpm install
git submodule update --init --recursive package/prediction-v2
pnpm lint && pnpm test && pnpm smoke
```
