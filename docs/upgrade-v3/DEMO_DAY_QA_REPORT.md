# RetroPick Protocol Camp Demo Day QA Report

**Date:** 2026-07-03  
**Branch:** `release/demo-rc-v3` (`ee0261e0d` + QA P0 default-export fix, uncommitted)  
**Reviewer:** Cursor Agent (Demo Day QA pass)

## Verdict

**GO**

RetroPick is ready to demo at Protocol Camp using the **Base Sepolia core structured event-market lifecycle** with all V3 / GoodDollar flags off. Upgrade V3 scaffolding is locally verified; Alfajores and GoodDollar surfaces remain preview-only until registry broadcast.

## Source of truth used

| Source | Used |
|--------|------|
| Graphify CLI + [`graphify-out/graph.json`](../../graphify-out/graph.json) | `./scripts/graphify-all.sh --first-party-only`; `graphify query "demo readiness backend frontend contracts"` |
| [`docs/upgrade-v3/`](./) + [`.dev/.upgrade_v3/`](../../.dev/.upgrade_v3/) | Release runbooks, flags policy, phase-1 gate |
| [`packages/contracts/registry.base-sepolia.json`](../../packages/contracts/registry.base-sepolia.json) | Populated Base Sepolia addresses |
| [`packages/contracts/registry.celo-alfajores.json`](../../packages/contracts/registry.celo-alfajores.json) | Placeholder treasury addresses |
| Live commands (this pass) | Build/test/smoke below |
| Opensrc graphs | Reference only per [`.ai/AGENTS-opensrc.md`](../../.ai/AGENTS-opensrc.md) |

## Demo lane

### Primary (GO)

**RetroPick core structured event-market lifecycle on Base Sepolia**

- Connect wallet on Base Sepolia (chain id `84532`)
- Markets → deposit mSTK (faucet) → indexer portfolio projection
- Optional: WebSocket market channels in devtools
- Runbook: [`demo-base-sepolia-fallback.md`](./demo-base-sepolia-fallback.md)

### Secondary (preview / roadmap only)

| Surface | Status |
|---------|--------|
| Alfajores V3 E2E | Prepared, **not deployed** (registry placeholders) |
| GoodDollar API | Stub / disabled (`404 feature_disabled` with flags off) |
| GoodDollar UI | Preview pages; `VITE_GOODDOLLAR_ENABLED` off by default |
| Daily market on-chain entry | Preview UI only |
| EngagementRewards / GoodID | Roadmap; not live in RC |

## Evidence summary

| Area | Command / evidence | Result | Notes |
|------|-------------------|--------|-------|
| P0 frontend build | `pnpm typecheck` + `pnpm build` (fe-v1) | **PASS** (post-fix) | Added `export default` to 5 V3 lazy routes |
| Backend build | `go build ./...` | PASS | |
| Backend tests | `go test ./... -count=1` | PASS | Includes `TestMigrationV3`, V3 guard tests |
| Treasury contracts | `forge test --match-path "test/treasury/*"` | PASS (8/8) | FeeRouter + invariant fuzz |
| Full Foundry | `forge test` | 395 pass, 1 fail | `ModularAndYieldScripts.t.sol` script pipeline — not demo path |
| Frontend tests | `pnpm test -- --run` | PASS (150 tests) |
| Graphify | `./scripts/graphify-all.sh --first-party-only` | PASS | 5435 nodes; report at `graphify-out/GRAPH_REPORT.md` |
| V3 placeholder guard | `go test ./internal/config/... ./internal/registry/...` | PASS | Flags on + placeholder registry rejected |
| GoodDollar disabled | `GET /api/v1/gooddollar/status` | 404 `feature_disabled` | Flags off |
| Base Sepolia registry | `registry.base-sepolia.json` | Populated | ME proxy non-zero |
| Alfajores registry | `registry.celo-alfajores.json` | Placeholders | All treasury + ME `0x000…` |
| API smoke | `./scripts/smoke-production.sh http://127.0.0.1:8080` | PASS | livez, health, readyz, markets |
| Alfajores smoke (partial) | `./scripts/demo-alfajores-smoke.sh` | PASS (partial) | Skips V3 routes when flags off |
| Indexer | Health payload during smoke | Syncing | `lastIndexedBlock` 40650938+ |
| Rehearsal log | [`demo-base-sepolia-rehearsal.md`](./demo-base-sepolia-rehearsal.md) | Updated | `REHEARSED` |

## What is live / demoable

- Base Sepolia MarketEngine proxy and embedded registry in API
- Go API: health, markets, config/contracts, tx prepare, portfolio paths
- Indexer projection pipeline (Postgres + chain sync)
- Frontend production build and vitest suite
- V3 treasury contracts (local Foundry verification)
- Startup guard: V3 flags refuse placeholder Alfajores registry
- CI gates on `release/demo-rc-v3`: treasury match-path, migration V3 smoke, sqlc drift (per `.github/workflows/`)

## What is preview or roadmap

- Alfajores on-chain deploy (RC-1.1 / RC-1.2 pending operator broadcast)
- GoodDollar wallet flows, daily market wallet writes
- EngagementRewards on-chain claims, GoodID external verification
- Fee routing demo on Alfajores (requires live FeeRouter + flags on)
- Full bus strangler extraction (inline indexer handlers remain)

## Safe public claim

> RetroPick is GO for Protocol Camp Demo Day. The core structured event-market lifecycle is demoable on Base Sepolia, and Upgrade V3 has been locally verified with feature guards, CI gates, release docs, and a prepared Alfajores deployment path. GoodDollar and Alfajores surfaces are labeled preview-only until registry broadcast and RC-1.4 smoke pass.

## What not to claim

- Mainnet-ready
- Fully live GoodDollar unless Alfajores registry + E2E smoke prove it
- Fully live EngagementRewards or GoodID
- Fully live Alfajores while registry placeholders remain
- Guaranteed yield
- Betting / gambling / casino positioning in public narrative

## P0 blockers

**None** after QA P0 fix (frontend default exports for V3 lazy routes).

Pre-fix blocker (resolved): `pnpm build` / `pnpm typecheck` failed on named-export V3 pages — blocked Docker `web` image and production build.

## P1 follow-ups after Demo Day

1. Operator: Alfajores ME + treasury broadcast; populate `registry.celo-alfajores.json`; run full `demo-alfajores-smoke.sh` with flags on
2. Fix `test/script/ModularAndYieldScripts.t.sol::test_modular_pipeline_endToEnd` (non-demo Foundry failure)
3. Optional copy polish: educational strings in `marketTypeDiscoverContent.ts` / `ManualTradeCard.tsx` use “betting” in on-chain epoch context — consider “forecasting window” for public-facing discover copy
4. Commit QA P0 default-export fix to `release/demo-rc-v3`
5. Record wallet deposit tx hash in rehearsal log at live demo
6. Resolve local port `5433` conflict if using default `docker compose` postgres publish on developer machines

## QA P0 fix applied (this pass)

Added `export default` to:

- `apps/web/src/features/daily-market/DailyMarketPage.tsx`
- `apps/web/src/features/rewards/RewardsPage.tsx`
- `apps/web/src/features/referrals/InvitePage.tsx`
- `apps/web/src/features/learn/LearnPage.tsx`
- `apps/web/src/features/impact/ImpactDashboardPage.tsx`

---

# Final QA Result

## Verdict

**GO**

## Why GO

- Backend and treasury contract test suites pass; migration V3 smoke passes
- Frontend tests and **production build** pass after surgical default-export fix
- Base Sepolia registry populated; API smoke script passes against live local stack
- V3 flags default off; placeholder registry guard tested; GoodDollar returns explicit `feature_disabled`
- Alfajores/GoodDollar correctly classified as preview — does not block core demo

## Source of truth checked

Graphify + `docs/upgrade-v3` + registries + live build/test/smoke commands on `release/demo-rc-v3`.

## Demo lane

Base Sepolia: wallet connect → markets → faucet-funded deposit → portfolio/indexer updates. Mention V3 treasury scaffolding and Alfajores path as **prepared preview**, not live.

## What to say publicly

1. RetroPick is an oracle-resolved structured event-market protocol for real-world outcomes — open, lock, resolve, claim.
2. The Protocol Camp demo runs on Base Sepolia with indexer-backed UX; Upgrade V3 adds treasury/referral scaffolding verified locally with strict feature guards.
3. GoodDollar / Alfajores integration is in preview until on-chain deploy and E2E smoke complete.

## What to avoid saying

- “Fully live on Alfajores” or “GoodDollar live” without registry + smoke proof
- Mainnet-ready, guaranteed yield, betting/gambling framing
- EngagementRewards or GoodID as production features

## Remaining post-demo engineering tasks

- Alfajores operator deploy + registry update + RC-1.4 full smoke
- Commit and tag demo RC with P0 build fix
- ModularAndYieldScripts Foundry test investigation
- Optional marketing copy pass on discover/educational strings
