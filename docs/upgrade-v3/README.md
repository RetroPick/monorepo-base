# RetroPick Upgrade V3 — Active Docs

**This folder is ACTIVE:** as-built evidence, operator runbooks, sprint reports, and demo procedures. Use these docs for production hardening, staging smoke, and release decisions.

**Design packs (archived, forward-looking):**

- Phase 1 foundation: [`docs/archive/upgrade-v3-design/upgrade-v3/`](../archive/upgrade-v3-design/upgrade-v3/)
- Phase 2 GoodDollar: [`docs/archive/upgrade-v3-design/gooddollars/`](../archive/upgrade-v3-design/gooddollars/)
- V2 architecture review: [`MonorepoGoal-v2-review.md`](../archive/upgrade-v3-design/MonorepoGoal-v2-review.md)

## Alfajores status

**PREVIEW** — not staging-live. Alfajores requires operator-approved broadcast, registry update (no `0x000…` placeholders), `cast code` verification, and staging smoke pass before enabling V3 flags or claiming GoodDollar live. See [`alfajores-staging-deploy-log.md`](./alfajores-staging-deploy-log.md).

## Non-negotiables

1. **MarketEngine** remains on-chain settlement source of truth.
2. Pool-based markets — no CLOB rewrite.
3. Postgres projections + `realtime_events` are the default UX read model.
4. No Redis, Kafka, NATS, or microservice decomposition.
5. GoodDollar adds token utility, identity, and claim UX — not settlement.
6. Monorepo paths stay at `apps/fe-v1`, `apps/backend`, `package/prediction-v2` until a later rename pass.

## Active reading order (as-built + runbooks)

| # | Doc | Topic |
|---|-----|-------|
| 1 | [PRODUCTION_HARDENING_REPORT.md](./PRODUCTION_HARDENING_REPORT.md) | Sprint 1/2 hardening evidence |
| 2 | [phase-1-exit-gate.md](./phase-1-exit-gate.md) | Phase 1 completion criteria |
| 3 | [storage-layout.md](./storage-layout.md) | Storage-layout CI reference |
| 4 | [indexer-projection-map.md](./indexer-projection-map.md) | Indexer idempotency map |
| 5 | [lifecycle-oracle-coverage.md](./lifecycle-oracle-coverage.md) | Lifecycle/oracle gap matrix |
| 6 | [alfajores-staging-deploy-log.md](./alfajores-staging-deploy-log.md) | Alfajores operator runbook (PREVIEW) |
| 7 | [demo-alfajores.md](./demo-alfajores.md) | Alfajores smoke procedure |
| 8 | [demo-flags.md](./demo-flags.md) | V3 feature-flag reference |
| 9 | [RELEASE_DEMO_RC.md](./RELEASE_DEMO_RC.md) | Demo release candidate scope |
| 10 | [DEMO_DAY_QA_REPORT.md](./DEMO_DAY_QA_REPORT.md) | Demo Day QA output |

## Archived design reading order

| # | Doc | Topic |
|---|-----|-------|
| 1 | [00-executive-summary](../archive/upgrade-v3-design/upgrade-v3/00-executive-summary.md) | V3 thesis and cuts |
| 2 | [01-upgrade-v3-scope](../archive/upgrade-v3-design/upgrade-v3/01-upgrade-v3-scope.md) | Build now vs later |
| 3 | [02-target-architecture](../archive/upgrade-v3-design/upgrade-v3/02-target-architecture.md) | End-state diagram |
| 4 | [04-smart-contract-upgrade-plan](../archive/upgrade-v3-design/upgrade-v3/04-smart-contract-upgrade-plan.md) | FeeRouter + vaults |
| 5 | [06-backend-domain-architecture](../archive/upgrade-v3-design/upgrade-v3/06-backend-domain-architecture.md) | platform/ + domain/ |
| 6 | [07-indexer-event-bus-realtime](../archive/upgrade-v3-design/upgrade-v3/07-indexer-event-bus-realtime.md) | Bus decoupling |
| 7 | [12-database-migrations](../archive/upgrade-v3-design/upgrade-v3/12-database-migrations.md) | V3 tables |
| 8 | [13-api-contracts](../archive/upgrade-v3-design/upgrade-v3/13-api-contracts.md) | New API groups |
| 9 | [15-testing-and-ci-cd](../archive/upgrade-v3-design/upgrade-v3/15-testing-and-ci-cd.md) | Test gates |

## Demo Day QA

Paste [`prompts/cursor-demo-day-qa-prompt.md`](./prompts/cursor-demo-day-qa-prompt.md) into a new Cursor chat for the Protocol Camp final QA pass. Output: [`DEMO_DAY_QA_REPORT.md`](./DEMO_DAY_QA_REPORT.md).

## Phase 2 (GoodDollar)

After Phase 1 passes the exit gate, implement the [gooddollars pack](../archive/upgrade-v3-design/gooddollars/README.md). First chain target: **Celo Alfajores** (44787) — **PREVIEW until broadcast complete**.

## Architectural decisions

See [DECISIONS.md](../../DECISIONS.md) entries D10–D14.
