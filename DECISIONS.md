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

When a decision conflicts with a shortcut, **orchestrator** blocks the task until this table is updated or the shortcut is withdrawn.
