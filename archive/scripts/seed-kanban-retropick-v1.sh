#!/usr/bin/env bash
# Idempotently create parallel work cards on Hermes Kanban board retropick-v1.
# Requires: hermes CLI, board retropick-v1 (see .harness/docs/kanban-seed-retropick-v1.md).
# Usage: from anywhere —  ./scripts/seed-kanban-retropick-v1.sh
#    or: bash scripts/seed-kanban-retropick-v1.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOARD="${HERMES_KANBAN_BOARD:-retropick-v1}"
WS="dir:${ROOT}"

if ! command -v hermes >/dev/null 2>&1; then
  echo "ERROR: hermes CLI not on PATH" >&2
  exit 1
fi

create_triage() {
  local idem="$1"
  local title="$2"
  local body="$3"
  echo "=== create: $title"
  hermes kanban --board "$BOARD" create "$title" \
    --workspace "$WS" \
    --triage \
    --idempotency-key "$idem" \
    --body "$body" || true
}

echo "Board: $BOARD"
echo "Workspace: $WS"
echo ""

create_triage "retropick-v1-seed-fe-markets-bundle" \
  "[fe-markets] Shrink top chunks from bundle analyzer" \
"Run: pnpm --filter web analyze (writes HTML under apps/web/.next/analyze/ — e.g. client.html; set OPEN_ANALYZER=true to auto-open the treemap).
Pick the 3 largest first-load chunks; apply next/dynamic or import narrowing.
Acceptance: LCP-neutral or improved on /markets; pnpm verify green.
Spec: apps/web/README.md (Bundle analysis)
Task file: .harness/tasks/backlog/fe-markets-bundle-analyze-followups.md
Harness owner: fe-markets"

create_triage "retropick-v1-seed-fe-markets-lcp" \
  "[fe-markets] LCP pass on primary routes" \
"Profile /markets (and next heaviest route) with Lighthouse or Web Vitals extension.
Document baseline + one config or component fix (fonts, hero, data waterfall).
Acceptance: numbers in ORCHESTRATOR.md or apps/web README; pnpm verify green.
Task file: .harness/tasks/backlog/fe-markets-lcp-primary-routes.md
Harness owner: fe-markets"

create_triage "retropick-v1-seed-fe-wallet-defer" \
  "[fe-wallet] Defer heavy wallet UI until connect intent" \
"Measure wallet-related JS before/after; defer modals or SDK init behind user gesture where safe.
Acceptance: no regression on connect/sign; pnpm verify green.
Task file: .harness/tasks/backlog/fe-wallet-defer-heavy-wallet-ui.md
Harness owner: fe-wallet"

create_triage "retropick-v1-seed-fe-ops-lifecycle" \
  "[fe-ops] Wire lifecycle / oracle pages to live ops APIs" \
"Extend archive/apps/ops-web routes beyond preflight: align with archive/docs/feature/ops-admin-operator-workflow.md API column.
Acceptance: each touched route loads without 404 to documented ops endpoints; Vitest where pure helpers exist.
Task file: .harness/tasks/backlog/fe-ops-lifecycle-oracle-api-surface.md
Harness owner: fe-ops"

create_triage "retropick-v1-seed-be-keeper-smoke" \
  "[be-keeper] Document + script happy-path keeper checks" \
"Tie .dev/backend/keeper.md + operations-runbook to one curl/smoke sequence operators can run before rotate keys.
Acceptance: doc PR + optional script under scripts/; pnpm smoke still green.
Task file: .harness/tasks/backlog/be-keeper-operator-smoke-sequence.md
Harness owner: be-keeper"

create_triage "retropick-v1-seed-be-api-indexer" \
  "[be-api] Expose indexer health for ops JSON consumers" \
"Ensure /health or ops global-state fields are stable for fe-ops preflight and external monitors; version any new fields.
Acceptance: archive/apps/ops-web OpsDeployPreflight still works; Go tests for touched handlers.
Task file: .harness/tasks/backlog/be-api-indexer-health-contract.md
Harness owner: be-api"

create_triage "retropick-v1-seed-qa-prod-smoke" \
  "[qa-integration] One command prod-smoke outline" \
"Align scripts/smoke-production.sh (or successor) with PRODUCTION.md checklist; document env prerequisites only, no secrets.
Acceptance: doc + dry-run instructions; pnpm verify green.
Task file: .harness/tasks/backlog/qa-integration-prod-smoke-doc.md
Harness owner: qa-integration"

create_triage "retropick-v1-seed-docs-runbook-links" \
  "[docs-curator] Cross-link ops workflow ↔ backend runbooks" \
"Remove stale anchors; ensure docs/feature/ops-admin-operator-workflow.md paths match files under .dev/backend/.
Acceptance: cli/harness doctor clean; no broken relative links from ORCHESTRATOR.md.
Task file: .harness/tasks/backlog/docs-curator-ops-runbook-crosslinks.md
Harness owner: docs-curator"

echo ""
echo "=== stats ==="
hermes kanban --board "$BOARD" stats 2>&1 || true
