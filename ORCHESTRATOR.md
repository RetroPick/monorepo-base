# ORCHESTRATOR.md — RetroPick engineering plan

## Objective

Ship and harden **RetroPick v1**: working **fe-v1** + **Go backend** + **MarketEngine** contracts, with indexer/keeper/realtime paths trustworthy for demos and ops.

## Execution strategy (phased)

### Phase 0 — Repo and harness health

- `pnpm install`; Foundry libs in `contracts/legacy-pool-v1` if needed
- `pnpm lint`, `pnpm test`, `pnpm smoke` green (`go test` under `apps/backend`)
- `cli/harness doctor projects/retropick` clean
- Kanban board `retropick-v1`: run **`./scripts/seed-kanban-retropick-v1.sh`** (idempotent Hermes `create --triage`) or paste cards from [`.harness/docs/kanban-seed-retropick-v1.md`](.harness/docs/kanban-seed-retropick-v1.md) (parallel **fe-markets / fe-wallet / fe-ops / be-keeper / be-api / qa / docs** slices)
- Harness **Phase 0** task closed: [.harness/tasks/done/phase0-verify-green.md](.harness/tasks/done/phase0-verify-green.md) (`pnpm verify` + `contracts/legacy-pool-v1` contracts present). **`.harness/tasks/backlog/`** is empty until new cards are filed from later phases.

### Phase 1 — Contract truth frozen for API

- `sc-market-engine` + `sc-oracles`: align types with `currentSmartContract.md` (epoch states, template fields)
- `sc-testing`: stabilize Foundry suite for touched surfaces
- **`pkg-abi-registry`**: regenerate ABIs/types if events or selectors change

### Phase 2 — Indexer and projections

- `be-indexer`: event handlers ↔ `chain_events` ↔ read models used by API
- `be-data`: migrations for any new projection columns
- `qa-integration`: fixture RPC or recorded logs where applicable

### Phase 3 — API and realtime

- `be-api`: stable JSON for markets, epochs, user positions
- `be-realtime`: envelope ordering and WS subscription semantics
- `fe-markets`: consume API + chain reads without invented states
- **`fe-markets` perf:** `apps/web/next.config.mjs` — expanded `optimizePackageImports` (incl. `@reown/*`, `lightweight-charts`, `@worldcoin/idkit`), lazy `MarketsAll` route chunk in `src/App.tsx`, production `compiler.removeConsole`, `pnpm analyze` for bundle graphs (see `apps/web/README.md` § Analyzer follow-ups). **LCP / primary routes:** `app/[[...slug]]/loading.tsx` (instant server shell before client bundle), self-hosted `@fontsource/*` in `app/layout.tsx` (see `apps/web/README.md` § LCP). **Cold `ClientApp` graph:** lazy `OnboardingModal` until the modal is shown (`OnboardingContext.tsx`). **`fe-wallet`:** deferred AppKit init + no static `modal` import in `openAppKitModal` (`src/lib/retropickAppKit.ts`, `Web3ModalProvider.tsx`; see `apps/web/README.md` § Wallet / AppKit cold path).

### Phase 4 — Automation and funding

- `be-keeper`: job scheduling and safe execution paths
- `be-funding`: abstraction only where product requires it; document limits

### Phase 5 — Operator and DevOps

- `fe-ops`: parity with operator workflows from docs
- `devops-sre`: Compose, hairpin env, observability hooks
- `security`: review admin/keeper/env boundaries before any prod-adjacent deploy

**Operator workflow (single doc):** [docs/feature/ops-admin-operator-workflow.md](docs/feature/ops-admin-operator-workflow.md) — maps `apps/ops-web` routes to backend ops APIs, recommended sequencing, per-agent micro-plan table, and orchestrator report template. The ops app **Overview** includes a short in-UI playbook that mirrors this order.

**Persistent backend runbook:** [.dev/backend/operations-runbook.md](.dev/backend/operations-runbook.md) — health endpoints, indexer lag, websocket, keeper triage, and code pointers; pairs with [PRODUCTION.md](PRODUCTION.md) for supported deploy shapes and cost.

## Agent assignment rubric

- **Single-layer bug** → primary owner agent for that layer (see `AGENTS.md` table).
- **Cross-layer mismatch** → orchestrator splits tasks; **indexer** + **API** + **FE** must cite same event name / field.
- **Oracle / settlement ambiguity** → `sc-oracles` + doc citation before coding.

## Verify commands

```bash
pnpm install
cd contracts/legacy-pool-v1 && git submodule update --init --recursive
pnpm lint
pnpm test
pnpm smoke
pnpm dev:web
```

## Kanban

Board **`retropick-v1`** — workspace is the **absolute path** to this repo root. See [`HARNESS.md`](HARNESS.md) for dashboard access.

When columns are empty, run **`./scripts/seed-kanban-retropick-v1.sh`** (fills **Triage** with eight cards), or paste manually from **[`.harness/docs/kanban-seed-retropick-v1.md`](.harness/docs/kanban-seed-retropick-v1.md)**. Assign **Hermes worker profiles** on **Ready** tasks, then promote to **In progress**. Harness agent slugs in each card body are planning owners, not dispatch identities.

**fe-v1 bundle analysis:** `pnpm --filter web analyze` (treemap; `ANALYZE=true` only for that script).
