# HARNESS.md — RetroPick

Embedded harness project under `agent-harness/projects/retropick/`.

Short pointer from [`docs/AGENT-HARNESS.md`](docs/AGENT-HARNESS.md) — this file is the full harness onboarding (CLI, Kanban, verify, contracts, MCP).

## Switch and verify

From harness root (`AGENT_HARNESS_HOME`):

```bash
cli/harness switch-project retropick
cli/harness doctor projects/retropick
pnpm install
cd package/prediction-v2 && git submodule update --init --recursive
pnpm lint && pnpm test && pnpm smoke
```

## CLI

```bash
cli/harness switch-project retropick
cli/harness doctor projects/retropick
cli/harness index-project projects/retropick
cli/harness obsidian init projects/retropick
```

## Kanban dashboard

- **Board:** `retropick-v1`
- **Workspace:** `dir:$AGENT_HARNESS_HOME/projects/retropick`
- **Web UI:** Hermes dashboard (not the Telegram gateway). Example URL: `http://127.0.0.1:9119/kanban?board=retropick-v1`
- If the page does not load, start **`hermes dashboard`** (see harness `docs/08-hermes-integration.md`) and, on WSL↔Windows, refresh port proxy scripts as needed.
- **Seed cards:** `./scripts/seed-kanban-retropick-v1.sh` or paste from [`.harness/docs/kanban-seed-retropick-v1.md`](.harness/docs/kanban-seed-retropick-v1.md)

## Agent roster

Twenty specialized agents live under `.harness/agents/*.agent.md`. The orchestrator assigns work by domain (contracts, Go services, FE apps, QA, docs, DevOps, harness). See also [`AGENTS.md`](AGENTS.md).

## RAG / MCP

```bash
cli/harness index-project projects/retropick
cli/harness start-mcp projects/retropick   # requires AEGIS_WORKSPACE
```

Contract subfolder may ship its own `.cursor/mcp.json`; project-root harness MCP remains canonical for multi-repo orchestration.

## Contracts (Foundry)

Contract sources live in **`package/prediction-v2`**. Initialize Foundry libs when needed:

```bash
cd package/prediction-v2 && git submodule update --init --recursive
pnpm contracts:test
```

## Migration note

Copied from `~/dev/Project/RetroPick/monorepo-base` into `projects/retropick/`. Original tree kept until validation complete.

## MCP conflict

Contract subfolder may have its own `.cursor/mcp.json`. Harness merge at project root wins for orchestration.

## Doc index

Product and deploy docs: [`docs/README.md`](docs/README.md).
