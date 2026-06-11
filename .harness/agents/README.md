# RetroPick harness agents

Twenty domain agents for orchestrator assignment. Each file: **Job**, **Soul**, **Outputs**, **Escalation**.

| # | File | One-line |
|---|------|----------|
| 1 | `orchestrator.agent.md` | Slices, Kanban, gates |
| 2 | `sc-market-engine.agent.md` | Dispatcher, modules, storage |
| 3 | `sc-oracles.agent.md` | Adapters, checkpoints |
| 4 | `sc-deploy-upgrades.agent.md` | Scripts, UUPS wiring |
| 5 | `sc-testing.agent.md` | Foundry, gas |
| 6 | `be-api.agent.md` | REST HTTP |
| 7 | `be-indexer.agent.md` | Logs, reorg, projections |
| 8 | `be-keeper.agent.md` | Automation executor |
| 9 | `be-funding.agent.md` | Funding workers |
| 10 | `be-realtime.agent.md` | WS + pg_notify |
| 11 | `be-data.agent.md` | Migrations, sqlc |
| 12 | `fe-markets.agent.md` | User trading UI |
| 13 | `fe-wallet.agent.md` | wagmi / AppKit |
| 14 | `fe-ops.agent.md` | Operator app |
| 15 | `pkg-abi-registry.agent.md` | ABIs, workspace packages |
| 16 | `security.agent.md` | Trust boundaries |
| 17 | `qa-integration.agent.md` | Cross-stack verify |
| 18 | `docs-curator.agent.md` | Doc truth |
| 19 | `devops-sre.agent.md` | Docker, envs |
| 20 | `harness-librarian.agent.md` | Harness MCP/RAG/tasks |

Enable list: `.harness/project.manifest.json` → `agents.enabled`.
