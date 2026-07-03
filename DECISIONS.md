# DECISIONS.md — RetroPick architectural gates

| ID | Decision | Rationale | Owner agent |
|----|----------|-----------|-------------|
| D1 | **Single UUPS engine** per chain; proxy address is the product entrypoint | Matches `currentSmartContract.md` modular dispatcher | sc-market-engine |
| D2 | **Canonical chain rows** in `chain_events`; API read models are projections | Reorg-safe indexing; `architecture.md` | be-indexer |
| D3 | **Foundry** is the contract test gate; no un-tested Solidity merge | Submodule policy in `AGENTS.md` | sc-testing |
| D4 | **Keeper** mutates chain only via DB-claimed jobs + preflight | Hot-wallet safety; keeper docs | be-keeper |
| D5 | **Realtime** path: durable `realtime_events` + `pg_notify` + WS hub | Ordering and replay; not “WS-only truth” | be-realtime |
| D6 | **`.dev/backend`** mirrors deep docs; **`apps/backend`** is runnable source | README/backend README alignment | docs-curator |
| D7 | **Epoch UX** must reflect engine states (open/lock/resolve/claim) | Product invariant; no fake states | fe-markets |
| D8 | **Harness product paths** stay under manifest `paths.product` | Harness boundary rules | harness-librarian |
| D9 | **`package/prediction-v2`** is the canonical Foundry tree | Single in-repo contract package; no `smart-contract` submodule or `contract` alias | docs-curator |
| D10 | **V3 FeeRouter model** — protocol fees route through `FeeRouter` → `TreasuryVault` + `RewardsVault`; MarketEngine `treasury` points at FeeRouter | Keeps settlement path separate from fee economics; off-chain referral math | sc-market-engine |
| D11 | **Backend domain boundaries** — `internal/platform/*` for infra, `internal/domain/*` for business logic; domains do not import each other | Reduces god-binary risk; bus coordinates cross-domain | be-api |
| D12 | **Indexer bus decoupling** — decode + persist `chain_events`, then publish in-process bus events; durability stays in Postgres | Strangler refactor; no Redis/Kafka | be-indexer |
| D13 | **Monorepo renames deferred** — keep `apps/fe-v1`, `apps/backend`, `package/prediction-v2` paths during V3 | Incremental delivery; target names documented in upgrade-v3 pack | docs-curator |
| D14 | **Celo Alfajores first** for GoodDollar G$ integration (chainId 44787); mainnet profile follows staging validation | Lower risk before GoodBuilders demo | devops-sre |

When a decision conflicts with a shortcut, **orchestrator** blocks the task until this table is updated or the shortcut is withdrawn.
