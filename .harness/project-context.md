# RetroPick — Project Context

## Product

RetroPick is a prediction-market platform on **Base Sepolia** (dev focus): one upgradeable **`MarketEngine`** hosts many templates, each running **epochs** (open → lock → resolve → claim) with **Chainlink-family** and optional **trusted reporter** oracles. Settlement and fees are on-chain; treasury withdrawal is admin-gated per protocol design.

## Monorepo layout

| Path | Role |
|------|------|
| `apps/web` | Next.js user app (wagmi / viem / AppKit) |
| `apps/ops-web` | Operator dashboard |
| `apps/docs` | Docs app |
| `apps/backend` | **Canonical** Go API + indexer + keeper + realtime (`cmd/*`, `internal/*`) |
| `packages/` | Shared TS packages (ABIs, types) |
| `contracts/legacy-pool-v1` | Foundry contracts — read `currentSmartContract.md` |
| `.dev/backend/` | Deep markdown walkthrough of `apps/backend` (architecture, indexer, keeper, funding, security) |
| `docs/` | Product docs index ([`docs/README.md`](../docs/README.md)); harness: [`HARNESS.md`](../HARNESS.md) |

## Architecture split

- **Solidity:** `MarketEngineDispatcher` + modules + oracle adapters — see `contracts/legacy-pool-v1/currentSmartContract.md`.
- **Go:** `apps/backend` — REST + WS; indexer from chain logs; optional keeper loop; funding abstraction workers.
- **Frontend:** `apps/web` consumes API + on-chain reads; wallet connect via modern stack above.

## Agentic workflow (harness)

- **20 domain agents** under `.harness/agents/*.agent.md` — each has a **job**, **soul** (working style), outputs, and escalation path.
- **Orchestrator** sequences Kanban tasks in `.harness/tasks/` and enforces `DECISIONS.md` gates.
- **Skills:** `retropick-market-engine`, `systematic-debugging`, `tdd`, `web3-infra`, `solidity-security`, `hermes-kiro-runtime`, `agent-harness-os`, `harness-mcp`, `opensrc-research`.

## MCP note

RetroPick may have contract-subfolder MCP under `contracts/legacy-pool-v1/.cursor/mcp.json`. Harness MCP at **project root** wins when using `cli/harness switch-project retropick`.

## Invariants

1. **Epoch lifecycle** is defined by the engine — UI and API must not show impossible states.
2. Contract changes require **Foundry** tests in `contracts/legacy-pool-v1`.
3. Contract tree at `contracts/legacy-pool-v1/` must resolve for builds and docs.
4. **Indexer truth:** `chain_events` is canonical; projections and realtime are derived.
5. RAG excludes vendored forge libs and huge generated trees where configured in `.harness/rag.config.json`.



## Markets V1 (Polymarket product)

- **Docs root:** `.dev/markets-v1/` (canonical); pointer at `docs/markets-v1/README.md`
- **Agent contract:** `.dev/markets-v1/agent-harness/AGENT_OPERATING_CONTRACT.md`
- **Current phase:** PHASE-0 per `implementation-manifest.yaml`
- **BFF code:** `apps/backend/internal/markets/` — not legacy epoch (`/api/v1/legacy/markets/*`)
- **Web product:** `apps/web/src/products/markets/` with `NEXT_PUBLIC_PRODUCT=markets`
- **Android:** `apps/android/` — spec only until PHASE-5 scaffold

## Verification

```bash
pnpm install
cd contracts/legacy-pool-v1 && git submodule update --init --recursive
pnpm lint
pnpm test
pnpm smoke
```

## Kanban

- Board: `retropick-v1`
- Workspace: absolute path to this project root
- Dashboard URL pattern: `http://127.0.0.1:9119/kanban?board=retropick-v1` (requires `hermes dashboard` — see [`HARNESS.md`](../HARNESS.md))
