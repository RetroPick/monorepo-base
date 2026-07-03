# RetroPick Upgrade V3

Public documentation index for the V3 architecture stabilization and GoodDollar integration program.

**Source packs (implementation detail):**

- Phase 1 foundation: [`.dev/.upgrade_v3/upgrade-v3/`](../../.dev/.upgrade_v3/upgrade-v3/)
- Phase 2 GoodDollar: [`.dev/.upgrade_v3/gooddollars/`](../../.dev/.upgrade_v3/gooddollars/)

## Non-negotiables

1. **MarketEngine** remains on-chain settlement source of truth.
2. Pool-based markets — no CLOB rewrite.
3. Postgres projections + `realtime_events` are the default UX read model.
4. No Redis, Kafka, NATS, or microservice decomposition.
5. GoodDollar adds token utility, identity, and claim UX — not settlement.
6. Monorepo paths stay at `apps/fe-v1`, `apps/backend`, `package/prediction-v2` until a later rename pass.

## Reading order

| # | Doc | Topic |
|---|-----|-------|
| 1 | [00-executive-summary](../../.dev/.upgrade_v3/upgrade-v3/00-executive-summary.md) | V3 thesis and cuts |
| 2 | [01-upgrade-v3-scope](../../.dev/.upgrade_v3/upgrade-v3/01-upgrade-v3-scope.md) | Build now vs later |
| 3 | [02-target-architecture](../../.dev/.upgrade_v3/upgrade-v3/02-target-architecture.md) | End-state diagram |
| 4 | [04-smart-contract-upgrade-plan](../../.dev/.upgrade_v3/upgrade-v3/04-smart-contract-upgrade-plan.md) | FeeRouter + vaults |
| 5 | [06-backend-domain-architecture](../../.dev/.upgrade_v3/upgrade-v3/06-backend-domain-architecture.md) | platform/ + domain/ |
| 6 | [07-indexer-event-bus-realtime](../../.dev/.upgrade_v3/upgrade-v3/07-indexer-event-bus-realtime.md) | Bus decoupling |
| 7 | [12-database-migrations](../../.dev/.upgrade_v3/upgrade-v3/12-database-migrations.md) | V3 tables |
| 8 | [13-api-contracts](../../.dev/.upgrade_v3/upgrade-v3/13-api-contracts.md) | New API groups |
| 9 | [15-testing-and-ci-cd](../../.dev/.upgrade_v3/upgrade-v3/15-testing-and-ci-cd.md) | Test gates |
| 10 | [phase-1-exit-gate.md](./phase-1-exit-gate.md) | Phase 1 completion criteria |
| 11 | [demo-alfajores.md](./demo-alfajores.md) | Alfajores smoke demo script |

## Phase 2 (GoodDollar)

After Phase 1 passes the exit gate, implement [gooddollars pack](../../.dev/.upgrade_v3/gooddollars/README.md). First chain target: **Celo Alfajores** (44787).

## Architectural decisions

See [DECISIONS.md](../../DECISIONS.md) entries D10–D14.
