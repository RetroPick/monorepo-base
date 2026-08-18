# RetroPick Repository Audit

Last updated: 2026-06-03

## Executive Summary

RetroPick is already a functional monorepo, but it is not yet organized like a startup-grade product platform. The core code is present across `apps/backend`, `apps/web`, `apps/ops-web`, `apps/docs`, and `contracts/legacy-pool-v1`, while shared product logic is mostly embedded in frontend files. This audit keeps `apps/backend` canonical and repairs the contract alias before any larger directory split.

## Current Shape

- `apps/backend`: canonical Go backend for API, indexer, keeper, funding, price worker, realtime, migrations, and operational entrypoints.
- `apps/web`: canonical customer web app for market discovery, chain market detail, wallet integration, and trading flows.
- `apps/ops-web`: operator dashboard.
- `apps/docs`: docs frontend.
- `contracts/legacy-pool-v1`: existing Foundry contract project.
- `contracts/legacy-pool-v1`: canonical contract path for new references, restored as a symlink to `contracts/legacy-pool-v1`.
- `contracts/legacy-pool-v1`: compatibility alias that resolves through `contracts/legacy-pool-v1`.
- `packages/contracts`: existing shared ABI registry package.

## Findings

### Contract Path

`contracts/legacy-pool-v1` was a dangling symlink because `contracts/legacy-pool-v1` was absent. The migration restores `contracts/legacy-pool-v1 -> prediction-v2` so Foundry commands and new docs can use the canonical path without moving the submodule yet.

### Monorepo Foundation

The repo had `pnpm-workspace.yaml`, a `turbo.repo.json`, and root scripts, but no canonical `turbo.json`, no root TypeScript base config, and no shared config packages. The migration adds those pieces while preserving existing startup scripts and Docker workflows.

### Backend Boundaries

`apps/backend` already owns more than HTTP. It includes API handlers, indexing, keeper, funding, price worker, metrics, migrations, and websocket/realtime code. Splitting it into `apps/api`, `apps/indexer`, and workers now would add churn before the contracts and CI paths are stable.

### Shared Product Logic

Market type labels, rolling lifecycle labels, probability formatting, payout projection math, and position-facing helpers were scattered through frontend code. The migration adds shared packages to give future extraction a typed destination without forcing a risky import rewrite in the same change.

### Documentation

Active docs now have a map under `docs/README.md`, and future/design packs are being archived under `docs/archive`. Legacy `.docs` content and generated Repomix snapshots should stay out of active docs and be archived when tracked.

### Local Artifacts

Large local runtime artifacts exist and should remain ignored:

- `.retropick-deploy`
- `.retropick-launch`
- `.retropick-emergency`
- `.vercel`
- `.next`
- `node_modules`
- Foundry `out`, `cache`, and `broadcast`

Untracked `apps/web/sources/**` is not moved or tracked in this migration.

## Risks

- The worktree contains many pre-existing modifications. This migration avoids destructive cleanup and does not revert user-owned changes.
- Adding root `typecheck` exposes existing app type errors if present.
- Shared packages are initially foundations; app adoption should be incremental and test-backed.
- Foundry output directories remain local artifacts and should not be indexed into agent context.

## Recommended Next Steps

1. Keep `contracts/legacy-pool-v1` healthy and run Foundry tests before any contract path migration.
2. Adopt shared packages one vertical slice at a time, starting with market type labels and payout math.
3. Keep backend entrypoint split logical inside `apps/backend/cmd/*` until CI and production process supervision are stable.
4. Archive tracked legacy docs/generated snapshots, but leave ignored local runtime directories untouched.
