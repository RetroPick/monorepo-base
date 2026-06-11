# Ops admin dashboard — operator workflow (RetroPick)

This document ties **`apps/ops`** routes to **`apps/backend`** ops APIs, on-chain actions (via prepare flows), and **harness agents** so work can be sequenced, owned, and verified without mixing “planning roles” with Hermes dispatch profiles.

**Sources of truth (RAG / read order):**

- [Feature doc index](README.md), `.harness/project-context.md`, [ORCHESTRATOR.md](../../ORCHESTRATOR.md), `DECISIONS.md`
- **[`.harness/docs/kanban-seed-retropick-v1.md`](../../.harness/docs/kanban-seed-retropick-v1.md)** — copy-paste **Kanban** cards when the board is empty; links to `.harness/tasks/backlog/*.md` per lane
- `.dev/backend/architecture.md`, [.dev/backend/operations-runbook.md](../../.dev/backend/operations-runbook.md) — health checks, indexer lag, WS, keeper; cross-linked from [ORCHESTRATOR.md](../../ORCHESTRATOR.md) Phase 5
- [.dev/backend/epoch-field-parity.md](../../.dev/backend/epoch-field-parity.md) — `market_snapshots.status` → `GET /api/v1/markets` (`epochStatus`) → Discover lifecycle labels
- [PRODUCTION.md](../../PRODUCTION.md) — cost / deploy policy plus **scripted production smoke** (env: `RETROPICK_API_BASE`, optional `RETROPICK_OPS_JWT`; `scripts/smoke-production.sh` + `scripts/keeper-operator-smoke.sh`)
- `package/prediction-v2/currentSmartContract.md`

---

## 1. Two planes (do not conflate)

| Plane | What it is | Where it lives |
|-------|------------|----------------|
| **Harness planning agents** | Named roles (`be-api`, `fe-ops`, …) for sequencing and code ownership | `.harness/agents/*.agent.md`, `AGENTS.md` |
| **Hermes worker profiles** | CLI identities for `hermes -p …` dispatch | `~/.hermes/profiles/*` |

Switching harness project **does not** rename Hermes profiles. Kanban assignees should match real profiles if you want automated dispatch.

---

## 2. Recommended operator sequence (happy path)

Use this order on first bring-up or after a deploy. Each step lists the **ops route**, the **primary API** (if any), and the **owning agent**.

0. **Overview** — `/` (home)  
   - Same **Deploy & prepare preflight** and **OpsOperatorHub** (shortcuts + runbook paths) as `/monitor`, so the default landing is not a “dead” page without environment truth.  
   - **Agents:** `fe-ops` (parity), `qa-integration` (first-load smoke)

1. **Health + chain alignment** — `/monitor`  
   - Confirms indexer lag vs RPC head, global counters.  
   - **UI:** **Deploy & prepare preflight** at the top (same live strip as `/prepare` / `/launch`), plus **Dashboard shortcuts** and **Runbooks (repo)** for `PRODUCTION.md`, `.dev/backend/operations-runbook.md`, and this workflow file.  
   - **API:** `/api/v1/health` (includes `schemaVersion`, `environment`, `chainId`, nested `indexer` aligned with global-state), `/api/v1/ops/global-state`  
   - **Agents:** `be-indexer` (lag), `be-api` (shape), `qa-integration` (smoke)

2. **Markets inventory** — `/templates`  
   - Templates table, rolling halt signals, drill-down to epochs.  
   - **UI:** **Deploy & prepare preflight** and **Dashboard shortcuts / Runbooks** (`OpsOperatorHub`) at the top, same live strip as Monitor (health, global state, indexer lag, prepare meta).  
   - **API:** `/api/v1/ops/templates`, template state routes  
   - **Agents:** `be-indexer` + `be-data` (projections), `fe-ops` (UI parity)

3. **Lifecycle / launch** — `/launch`  
   - Epoch transitions aligned with engine states (open → lock → resolve → claim).  
   - **UI:** **Deploy & prepare preflight** runs health + global state + optional prepare-meta + RPC head vs indexer lag (same panel on `/prepare`). **Dashboard shortcuts** and runbook paths appear directly under preflight.  
   - **Agents:** `sc-market-engine` (truth), `be-keeper` (automation), `fe-ops` (guards)

4. **Calldata & multisig** — `/prepare`  
   - Prepare transactions; export for safe signing.  
   - **API:** ops prepare routes (see `internal/api/ops_prepare.go`)  
   - **UI:** Generic prepare explorer plus the shared **Deploy & prepare preflight** strip for environment sanity before signing.  
   - **Agents:** `be-api`, `sc-deploy-upgrades`, `security` (admin boundaries)

5. **Keeper** — `/keeper`  
   - Schedule + execution history; incidents linkage.  
   - **UI:** Same **Deploy & prepare preflight** strip as `/launch` and `/prepare` (health, global state, indexer lag, prepare meta) at the top of the page.  
   - **API:** `/api/v1/ops/keeper/*`  
   - **CLI:** `./scripts/keeper-operator-smoke.sh` — pre-rotation probes (see [.dev/backend/keeper.md](../../.dev/backend/keeper.md) — section *Operator smoke*).  
   - **Agents:** `be-keeper`, `be-data`

6. **Oracles & feeds** — `/oracle`  
   - Feed registry health, staleness mental model.  
   - **UI:** **Deploy & prepare preflight** and **OpsOperatorHub** at the top so feed work starts with environment truth; feed table and `GET /api/v1/ops/oracle/health` below (graceful error if API is down).  
   - **Agents:** `sc-oracles`, `be-api`

7. **Incidents** — `/incidents`  
   - Open/closed incidents from indexer/keeper automation.  
   - **UI:** Same **Deploy & prepare preflight** strip, **Dashboard shortcuts**, and **Runbooks (repo)** as `/monitor` so triage starts with environment truth before scrolling the list.  
   - **Agents:** `be-keeper`, `qa-integration`

8. **Visibility & governance** — `/visibility`, `/governance`  
   - Public API visibility toggles; dispatcher wiring visibility.  
   - **UI:** Same **preflight + operator hub** strip at the top on both routes (theme variant on Visibility, zinc on Governance).  
   - **Agents:** `be-api`, `sc-market-engine`, `security`

9. **RETRODEPLOYER / chain ops** — `/retrodeployer`  
   - CLI bridge and runbook pointers — not a substitute for Foundry deploy scripts.  
   - **UI:** **Deploy & prepare preflight** at the top; **`OpsOperatorHub`** (same as `/monitor`) — shortcuts to Prepare, Launch, Templates, Monitor, Keeper, Incidents, Oracle, RETRODEPLOYER plus **Runbooks (repo)** paths.  
   - **Agents:** `sc-deploy-upgrades`, `devops-sre`

---

## 3. Per-agent micro-plan (orchestrator checklist)

For each agent, **plan → build → validate** should produce a short artifact (PR description section or Kanban comment).

| Agent | Plan (1–2 lines) | Build | Validate |
|-------|------------------|-------|----------|
| orchestrator | Slice vertical: one template epoch end-to-end | Sequence tasks; block on `DECISIONS.md` | `pnpm verify` + demo script |
| sc-market-engine | Epoch + module invariants | Solidity changes | `forge test` in submodule |
| sc-oracles | Feed encoding + staleness | Adapters | Foundry + ops oracle page |
| sc-deploy-upgrades | Proxy wiring + replay safety | Scripts | Dry run + doc update |
| sc-testing | Minimal repro for touched surface | Tests | Green Foundry |
| be-api | Stable JSON; no silent defaults | Handlers | `go test ./...` relevant pkgs |
| be-indexer | Event → projection mapping | Handlers | Indexer tests + reorg cases |
| be-keeper | Claim/execute/idempotency | Service | Keeper tests + schedule rows |
| be-funding | Ledger invariants | Workers | API + worker integration |
| be-realtime | Seq monotonicity | Hub + notify | WS replay test |
| be-data | Forward-only migrations | sqlc | Migrate up/down smoke |
| fe-markets | Epoch UX truth | fe-v1 | E2E / unit where exists |
| fe-wallet | Typed providers; no secret logs | fe-v1 | Lint + wallet flows |
| fe-ops | Ops parity with API | apps/ops | Vitest + manual walk |
| pkg-abi-registry | ABI diff discipline | regen | TS + Go compile |
| security | Trust boundaries on admin routes | review | Checklist in PR |
| qa-integration | Release gate script | scripts | `pnpm test` + smoke |
| docs-curator | Single diagram > vague prose | `.dev/` | Link check |
| devops-sre | Compose + prod templates | docker | `compose ps` |
| harness-librarian | Manifest paths | `.harness/` | `harness doctor` |

---

## 4. “Super fast” product note (frontend)

- **`apps/fe-v1`:** already uses `experimental.optimizePackageImports` for heavy packages.  
- **`apps/ops`:** keep icon and chart imports tree-shaken via the same Next.js option; prefer server components for read-only aggregates where possible.  
- **Backend:** projection tables + bounded `limit` query params — prefer indexed reads over ad-hoc joins in hot ops paths.

---

## 5. Verification (manifest)

From repo root:

```bash
pnpm install
git submodule update --init --recursive package/prediction-v2
pnpm lint && pnpm test && pnpm smoke
```

---

## 6. Orchestrator report template (paste into Kanban / PR)

- **Scope:** …  
- **Agent owners:** …  
- **User-visible outcome:** …  
- **API / chain touchpoints:** …  
- **Risk / security:** …  
- **Verification run:** (paste `pnpm test` / `forge test` summary)  
- **Follow-ups:** …
