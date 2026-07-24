# RetroPick Startup-Grade Monorepo Migration Plan

Last updated: 2026-06-03

## Goals

- Preserve product velocity while making the repo easier to build, test, review, and deploy.
- Keep `apps/backend` as the canonical backend during this migration.
- Repair contract paths before any future move to `contracts/evm`.
- Add shared TypeScript package destinations only when product logic has active multi-app consumers.
- Archive legacy/generated content without deleting valuable work.

## Phase 1: Foundation

- Restore `contracts/legacy-pool-v1` as the canonical Foundry path.
- Keep `contracts/legacy-pool-v1` as a compatibility alias.
- Add `turbo.json`, `tsconfig.base.json`, CI workflows, PR template, `CONTRIBUTING.md`, and CODEOWNERS placeholder.
- Normalize root scripts for `dev`, `build`, `lint`, `typecheck`, `test`, `check`, `format`, `clean`, `contracts:build`, and `contracts:test`.
- Keep existing `dev:web`, `dev:ops`, `dev:docs`, Docker, `retro`, and smoke scripts.

## Phase 2: Shared Product Packages

Extract shared packages only after there is an active second consumer:

- Market type enums and labels.
- Execution mode and rolling lifecycle labels.
- Probability and payout formatting.
- Pool-based payout projection math.

Do not keep placeholder-only packages for resolution, equivalence, chain abstraction, or Hyperliquid. They add build surface without product behavior.

## Phase 3: Apps

Keep current app paths for this PR:

- `apps/web`
- `apps/ops-web`
- `apps/docs`
- `apps/backend`

Future mapping, after CI is stable:

- `apps/web -> apps/web`
- `apps/ops -> apps/admin`
- `apps/backend/cmd/api` remains API service entrypoint.
- `apps/backend/cmd/indexer`, `cmd/keeper`, `cmd/funding-worker`, and `cmd/price-worker` remain worker service entrypoints.

## Phase 4: Contracts

- Keep `contracts/legacy-pool-v1` canonical.
- Run Foundry from `contracts/legacy-pool-v1`.
- Do not move contracts to `contracts/evm` until the submodule path is healthy and tests are green.

## Phase 5: Docs And Archive

Create or update:

- `docs/product/market-types.md`
- `docs/product/resolution-rules.md`
- `docs/product/equivalence-engine.md`
- `docs/engineering/architecture.md`
- `docs/engineering/local-development.md`
- `docs/engineering/ci-cd.md`
- `docs/engineering/technical-debt.md`

Archive:

- `.docs/**` into `archive/legacy/` when files still exist.
- Regenerate Repomix bundles on demand; do not keep generated repo snapshots in git.

Leave untouched:

- ignored deployment/runtime directories.
- untracked `apps/web/sources/**`.

## Verification

Target commands:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm contracts:build`
- `pnpm contracts:test`
- `go -C apps/backend test ./...`
