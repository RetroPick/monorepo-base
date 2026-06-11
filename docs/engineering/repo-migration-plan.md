# RetroPick Startup-Grade Monorepo Migration Plan

Last updated: 2026-06-03

## Goals

- Preserve product velocity while making the repo easier to build, test, review, and deploy.
- Keep `apps/backend` as the canonical backend during this migration.
- Repair contract paths before any future move to `contracts/evm`.
- Add shared TypeScript package destinations for product logic already used by the frontend.
- Archive legacy/generated content without deleting valuable work.

## Phase 1: Foundation

- Restore `package/prediction-v2` as the canonical Foundry path.
- Keep `package/prediction-v2` as a compatibility alias.
- Add `turbo.json`, `tsconfig.base.json`, CI workflows, PR template, `CONTRIBUTING.md`, and CODEOWNERS placeholder.
- Normalize root scripts for `dev`, `build`, `lint`, `typecheck`, `test`, `check`, `format`, `clean`, `contracts:build`, and `contracts:test`.
- Keep existing `dev:fe-v1`, `dev:ops`, `dev:docs`, Docker, `retro`, and smoke scripts.

## Phase 2: Shared Product Packages

Add package destinations:

- `@retropick/event-core`
- `@retropick/market-types`
- `@retropick/resolution-core`
- `@retropick/equivalence-engine`
- `@retropick/pricing`
- `@retropick/validators`
- `@retropick/chain`
- `@retropick/hyperliquid`

Extract immediately safe logic:

- Market type enums and labels.
- Execution mode and rolling lifecycle labels.
- Probability and payout formatting.
- Pool-based payout projection math.

Keep placeholder-only foundations for resolution, equivalence, chain abstraction, and Hyperliquid until production behavior is implemented and tested.

## Phase 3: Apps

Keep current app paths for this PR:

- `apps/fe-v1`
- `apps/ops`
- `apps/docs`
- `apps/backend`

Future mapping, after CI is stable:

- `apps/fe-v1 -> apps/web`
- `apps/ops -> apps/admin`
- `apps/backend/cmd/api` remains API service entrypoint.
- `apps/backend/cmd/indexer`, `cmd/keeper`, `cmd/funding-worker`, and `cmd/price-worker` remain worker service entrypoints.

## Phase 4: Contracts

- Keep `package/prediction-v2` canonical.
- Run Foundry from `package/prediction-v2`.
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
- `repomix-output.json` and `repomix-output.xml` into `archive/generated/repomix/`.

Leave untouched:

- ignored deployment/runtime directories.
- untracked `apps/fe-v1/sources/**`.

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
