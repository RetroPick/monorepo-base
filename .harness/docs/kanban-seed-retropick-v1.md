# Kanban seed — `retropick-v1` parallel work

Use this when the Hermes Kanban columns are empty but you want **many workers** in flight toward the same standing goal (markets UX, ops admin workflow, speed, validation).

## Board setup

- **Board:** `retropick-v1`
- **Workspace:** absolute path to this repo root (`cli/harness switch-project retropick` prints it in `active-project.env`).
- **Assignee:** must be a **real Hermes profile** (`hermes -p …`) for dispatch. The **Owner** column below is the **Harness planning agent** slug — copy it into the card body, not necessarily into the assignee field unless you created matching profiles.

## One-command seed (recommended)

From the RetroPick repo root (or any cwd — the script resolves its own root):

```bash
./scripts/seed-kanban-retropick-v1.sh
```

This calls `hermes kanban --board retropick-v1 create … --triage --workspace dir:<repo>` with **idempotency keys** (`retropick-v1-seed-*`), so re-running does not duplicate cards. Requires the **hermes** CLI on `PATH` and board `retropick-v1` (create the board once with `scripts/kanban-init-project-board.sh retropick` from Agent Harness if needed).

Override board: `HERMES_KANBAN_BOARD=my-board ./scripts/seed-kanban-retropick-v1.sh`

## How to seed manually

1. Create one card per row in **Triage** (or **Ready** if you already have capacity).
2. Paste the **Title** and **Body** (markdown) from each section.
3. Move to **Ready** when dependencies are clear; assign a **Hermes worker profile**; move to **In progress** when a machine picks it up.
4. Link back to the matching file under `.harness/tasks/backlog/` when the card is filed so `requireTaskFile` stays satisfied when work lands in git.

---

## Card A — Bundle follow-ups after first analyze run

- **Title:** `[fe-markets] Shrink top chunks from bundle analyzer`
- **Owner:** `fe-markets`
- **Body:**

```text
Run: `pnpm --filter web analyze` (writes HTML under `apps/web/.next/analyze/` — e.g. `client.html`; set `OPEN_ANALYZER=true` to auto-open the treemap).
Pick the 3 largest first-load chunks; apply `next/dynamic` or import narrowing.
Acceptance: LCP-neutral or improved on /markets; pnpm verify green.
Spec: apps/web/README.md (Bundle analysis)
Task file: .harness/tasks/backlog/fe-markets-bundle-analyze-followups.md
```

---

## Card B — LCP / route-level perf

- **Title:** `[fe-markets] LCP pass on primary routes`
- **Owner:** `fe-markets`
- **Body:**

```text
Profile /markets (and next heaviest route) with Lighthouse or Web Vitals extension.
Document baseline + one config or component fix (fonts, hero, data waterfall).
Acceptance: numbers in ORCHESTRATOR.md or apps/web README; pnpm verify green.
Task file: .harness/tasks/backlog/fe-markets-lcp-primary-routes.md
```

---

## Card C — Wallet / AppKit cold start

- **Title:** `[fe-wallet] Defer heavy wallet UI until connect intent`
- **Owner:** `fe-wallet`
- **Body:**

```text
Measure wallet-related JS before/after; defer modals or SDK init behind user gesture where safe.
Acceptance: no regression on connect/sign; pnpm verify green.
Task file: .harness/tasks/backlog/fe-wallet-defer-heavy-wallet-ui.md
```

---

## Card D — Ops admin API depth

- **Title:** `[fe-ops] Wire lifecycle / oracle pages to live ops APIs`
- **Owner:** `fe-ops`
- **Body:**

```text
Extend apps/ops routes beyond preflight: align with docs/feature/ops-admin-operator-workflow.md API column.
Acceptance: each touched route loads without 404 to documented ops endpoints; Vitest where pure helpers exist.
Task file: .harness/tasks/backlog/fe-ops-lifecycle-oracle-api-surface.md
```

---

## Card E — Keeper + incidents automation

- **Title:** `[be-keeper] Document + script happy-path keeper checks`
- **Owner:** `be-keeper`
- **Body:**

```text
Tie .dev/backend/keeper.md + operations-runbook to one curl/smoke sequence operators can run before rotate keys.
Acceptance: doc PR + optional script under scripts/; pnpm smoke still green.
Task file: .harness/tasks/backlog/be-keeper-operator-smoke-sequence.md
```

---

## Card F — Indexer lag surfacing in API

- **Title:** `[be-api] Expose indexer health for ops JSON consumers`
- **Owner:** `be-api`
- **Body:**

```text
Ensure /health or ops global-state fields are stable for fe-ops preflight and external monitors; version any new fields.
Acceptance: apps/ops OpsDeployPreflight still works; Go tests for touched handlers.
Task file: .harness/tasks/backlog/be-api-indexer-health-contract.md
```

---

## Card G — QA cross-stack smoke

- **Title:** `[qa-integration] One command prod-smoke outline`
- **Owner:** `qa-integration`
- **Body:**

```text
Align scripts/smoke-production.sh (or successor) with PRODUCTION.md checklist; document env prerequisites only, no secrets.
Acceptance: doc + dry-run instructions; pnpm verify green.
Task file: .harness/tasks/backlog/qa-integration-prod-smoke-doc.md
```

---

## Card H — Docs + harness librarian

- **Title:** `[docs-curator] Cross-link ops workflow ↔ backend runbooks`
- **Owner:** `docs-curator`
- **Body:**

```text
Remove stale anchors; ensure docs/feature/ops-admin-operator-workflow.md paths match files under .dev/backend/.
Acceptance: cli/harness doctor clean; no broken relative links from ORCHESTRATOR.md.
Task file: .harness/tasks/backlog/docs-curator-ops-runbook-crosslinks.md
```

---

## Orchestrator reporting

When any card completes, append a short bullet to your session handoff: **agent**, **PR scope**, **`pnpm verify`**, **follow-up risk**.
