# RetroPick Demo Day — Cursor QA Prompt

Paste into a **new** Cursor Agent chat from the RetroPick monorepo root.

For V3 **implementation** work (not QA), use [`.dev/.upgrade_v3/cursor-plan-prompt.md`](../../.dev/.upgrade_v3/cursor-plan-prompt.md) instead.

## Short paste (top of new chat)

```text
Read Graphify/context artifacts first, then docs/upgrade-v3. Treat the repo + Graphify as source of truth. This is a GO QA pass for Protocol Camp Demo Day, not new feature work. Verify what has been done, run the QA matrix, keep the public verdict as GO unless a real P0 blocker is found, and produce docs/upgrade-v3/DEMO_DAY_QA_REPORT.md.
```

## Full prompt

````text
You are Cursor Agent acting as a senior software QA engineer, release engineer, and demo-readiness reviewer for RetroPick.

This is a NEW Cursor chat.

Your first job is to rebuild context from the repo itself, not from memory.

Source of truth priority:
1. Actual repo files and current git branch.
2. Graphify / generated code graph / architecture graph.
3. docs/upgrade-v3/ and .dev/.upgrade_v3/ (implementation source packs).
4. DECISIONS.md.
5. Registry files and deployment configs.
6. Test/build results from commands you run now.
7. Previous summaries only as hints, never as truth.

Important:
Use Graphify for every context pass. Before making conclusions, inspect or regenerate the graph/context artifacts so your understanding is based on the actual repository.

Look for Graphify commands or artifacts in the repo:
- graphify CLI (query, path, explain, update) — see CLAUDE.md
- ./scripts/graphify-all.sh, ./scripts/graphify-retropick.sh — see .dev/graphify/RUNBOOK.md
- graphify-out/graph.json, graphify-out/GRAPH_REPORT.md, graphify-out/opensrc-*-graph.json
- .dev/knowledge-graph.json, .dev/.AllArchitecture.json (summary registry companions)
- .dev/graphify/README.md
- package.json scripts (generic fallback only — no pnpm graphify in root today)

Start with:

```bash
pwd
git status --short
git branch --show-current
git log --oneline -8

echo "=== Find graphify / graph context ==="
find . -maxdepth 4 -iname "*graphify*" -o -iname "*knowledge-graph*" -o -iname "*AllArchitecture*" -o -iname "*architecture*" | sort | head -300

echo "=== package scripts ==="
cat package.json 2>/dev/null || true
grep -R "\"graphify\"\|graphify\|knowledge-graph\|AllArchitecture\|graph" -n package.json scripts bin .github docs .dev 2>/dev/null | head -300
```

Repo-canonical Graphify orientation (preferred when graphify-out/graph.json exists):

```bash
graphify query "demo readiness backend frontend contracts"
graphify explain "MarketEngine epoch lifecycle"
graphify path "apps/fe-v1" "apps/backend"
```

Rebuild if stale or after code changes:

```bash
./scripts/graphify-all.sh --first-party-only
# Or focused:
# ./scripts/graphify-retropick.sh core|backend|frontend|contracts|full
```

Generic fallback (only if repo scripts unavailable):

```bash
pnpm graphify || pnpm run graphify || ./scripts/graphify || true
```

If Graphify is unavailable, do not fail immediately. Instead:

* report that Graphify command was not found,
* use existing generated graph artifacts if present (graphify-out/, .dev/knowledge-graph.json, .dev/.AllArchitecture.json),
* fall back to repo discovery with find, grep, docs, and tests.

After any approved code/doc change, run Graphify again if available and confirm generated graph artifacts are updated or unchanged.

Mission:
Run the final QA testing pass for RetroPick Demo Day.

Target verdict:
GO.

GO means:
RetroPick is ready to demo at Protocol Camp using the verified core demo lane.
GO does not mean every roadmap feature is production-live.

Do not add new features.
Do not rewrite architecture.
Do not deploy contracts unless I explicitly approve.
Do not fake GoodDollar, EngagementRewards, Alfajores, or wallet flows.
Do not change product scope.
Only fix true P0 QA blockers if they prevent the GO demo from running.

Primary context paths:

* docs/upgrade-v3/
* .dev/.upgrade_v3/
* DECISIONS.md
* .dev/knowledge-graph.json
* .dev/.AllArchitecture.json
* graphify-out/graph.json (if present locally)
* packages/contracts/registry.base-sepolia.json
* packages/contracts/registry.celo-alfajores.json
* apps/backend/
* apps/fe-v1/
* package/prediction-v2/
* packages/gooddollar/
* scripts/demo-alfajores-smoke.sh
* scripts/smoke-production.sh

Also inspect any open-source reference / opensrc project files if present in the repo.
Canonical opensrc rules: .ai/AGENTS-opensrc.md
Targeted search: ./scripts/opensrc-rg.sh

Search for:

* opensrc
* open-source
* references
* vercel-labs
* architecture references
* external reference docs

Run:

```bash
echo "=== Open source / opensrc references ==="
find . -maxdepth 5 -iname "*opensrc*" -o -iname "*open-source*" -o -iname "*reference*" | sort | head -300
grep -R "opensrc\|open-source\|vercel-labs\|reference repo\|source of truth" -n docs .dev scripts package.json apps packages .ai 2>/dev/null | head -300
```

Treat opensrc/reference material as architecture inspiration only unless the repo docs explicitly say it is canonical.
The canonical source of truth for RetroPick remains the actual RetroPick repo + Graphify + docs/upgrade-v3 + tests.

Important product positioning:
RetroPick is a structured event-market protocol for real-world outcomes beyond simple Yes/No markets.

Use:

* structured event markets
* real-world outcomes
* forecasting
* oracle-resolved
* data-settled
* clear rules
* open → lock → resolve → claim
* demoable protocol lifecycle

Avoid:

* betting
* gambling
* casino
* wager
* guaranteed yield
* fully live GoodDollar unless proven
* fully live EngagementRewards unless proven
* fully live Alfajores unless registry and smoke prove it
* 1M cold emails

Known previous completed work (hints only — verify with repo, Graphify, and commands):

* release/demo-rc-v3 branch created.
* V3 slice committed.
* demo-flags.md added.
* placeholder registry guard added.
* CI updated with treasury tests, migration smoke, and sqlc drift check.
* Base Sepolia fallback runbook added.
* GoodDollar / daily-market copy updated to avoid fake wallet actions.
* RELEASE_DEMO_RC.md added.
* phase-1-exit-gate.md synced.
* WS / ops observability docs added.

Do not trust this list blindly. Verify it with repo files, Graphify, and commands.

Start QA with read-only context discovery:

```bash
echo "=== Upgrade V3 docs ==="
find docs/upgrade-v3 .dev/.upgrade_v3 -maxdepth 3 -type f 2>/dev/null | sort

echo "=== Key release docs ==="
sed -n '1,260p' docs/upgrade-v3/RELEASE_DEMO_RC.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/demo-flags.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/demo-base-sepolia-fallback.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/demo-base-sepolia-rehearsal.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/demo-alfajores.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/phase-1-exit-gate.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/DEMO_DAY_GO_NO_GO.md 2>/dev/null || true
sed -n '1,260p' docs/upgrade-v3/DEMO_DAY_QA_REPORT.md 2>/dev/null || true
sed -n '1,260p' DECISIONS.md 2>/dev/null || true

echo "=== Registry files ==="
cat packages/contracts/registry.base-sepolia.json 2>/dev/null || true
cat packages/contracts/registry.celo-alfajores.json 2>/dev/null || true

echo "=== Placeholder scan ==="
grep -R "0x0000000000000000000000000000000000000000" -n \
  packages/contracts \
  docs/upgrade-v3 \
  .dev/.upgrade_v3 \
  apps/backend \
  apps/fe-v1 \
  packages/gooddollar \
  package/prediction-v2 2>/dev/null | head -300

echo "=== Feature flag scan ==="
grep -R "GOODDOLLAR_ENABLED\|REFERRALS_ENABLED\|REWARDS_ENABLED\|IMPACT_ENABLED\|FEE_ROUTER_ENABLED\|VITE_GOODDOLLAR_ENABLED\|REGISTRY_PATH\|FEE_ROUTER_ADDRESS" -n \
  docs/upgrade-v3 \
  .dev/.upgrade_v3 \
  apps/backend \
  apps/fe-v1 \
  docker-compose.alfajores.yml \
  compose.alfajores.env 2>/dev/null | head -300
```

Note: DEMO_DAY_GO_NO_GO.md and DEMO_DAY_QA_REPORT.md may not exist yet. If missing, note as a gap in the QA plan; create DEMO_DAY_QA_REPORT.md in QA-7.

After discovery, create a short QA plan before changing anything.

Output:

# RetroPick Demo Day QA Plan

## 1. Context found

List:

* Graphify command/artifacts found
* docs found
* missing docs
* opensrc/reference files found
* source-of-truth files found

## 2. Current branch state

Branch, dirty files, latest commits.

## 3. Intended GO lane

Default:
GO for Protocol Camp using the verified RetroPick core structured event-market lifecycle.

Classify V3 / GoodDollar / Alfajores according to evidence:

* live
* preview
* staging in progress
* roadmap

## 4. QA test matrix

List exact tests you will run.

## 5. Approval request

Ask me before making fixes or writing new docs.

After approval, run QA.

QA-1 — Full local build/test verification

```bash
export PATH="$HOME/.foundry/bin:/usr/local/go/bin:$PATH"

cd /home/asyam/dev/set-up/projects/retropick

echo "=== Backend ==="
cd apps/backend
go build ./...
go test ./... -count=1

echo "=== Contracts ==="
cd ../../package/prediction-v2
forge build
forge test --match-path "test/treasury/*" -vv
forge test -vv

echo "=== Frontend ==="
cd ../../apps/fe-v1
pnpm test -- --run
pnpm build
```

QA-2 — Graphify after verification

If Graphify exists, run it again after tests and before writing the final report.

```bash
# Preferred: repo scripts
./scripts/graphify-all.sh --first-party-only
# Or: graphify update .
# Generic fallback:
pnpm graphify || pnpm run graphify || ./scripts/graphify || true
```

Then check graph artifacts:

```bash
git status --short
find . -maxdepth 4 -iname "*knowledge-graph*" -o -iname "*AllArchitecture*" -o -iname "*graphify*" | sort | head -300
```

QA-3 — Feature flag and placeholder guard QA

* Verify flags off path works.
* Verify flags on with placeholder does not silently run.
* Verify error message is clear.
* Verify docs mention this behavior.

QA-4 — Base Sepolia demo QA

Use:

* docs/upgrade-v3/demo-base-sepolia-fallback.md
* docs/upgrade-v3/demo-base-sepolia-rehearsal.md
* registry.base-sepolia.json
* Graphify architecture context

Classify Base Sepolia demo as GO unless real P0 blocker appears.

QA-5 — Alfajores / GoodDollar QA classification

Classify Alfajores:

* verified live
* prepared but not deployed
* placeholder-only
* blocked

Classify GoodDollar:

* live verified
* API/stub preview
* UI preview only
* roadmap

Do not downgrade the whole Demo Day from GO if Alfajores is not live, as long as Base Sepolia core demo is GO.

QA-6 — UX copy QA

Search unsafe wording:

```bash
grep -R "betting\|gambling\|casino\|wager\|guaranteed yield\|easy money\|fully live\|GoodDollar live\|EngagementRewards live" -n \
  apps/fe-v1/src \
  docs/upgrade-v3 \
  .dev/.upgrade_v3 2>/dev/null | head -200
```

Only make P0 copy fixes if approved.

QA-7 — Create final QA report

Create or update: docs/upgrade-v3/DEMO_DAY_QA_REPORT.md

Report format:

# RetroPick Protocol Camp Demo Day QA Report

## Verdict

GO

## Source of truth used

List:

* Graphify artifacts / command
* docs/upgrade-v3 files
* registry files
* tests run
* repo branch/commit

## Demo lane

Primary:
RetroPick core structured event-market lifecycle.

Secondary:
Upgrade V3 / GoodDollar / Alfajores only according to verified status.

## Evidence summary

Table:

* Area
* Command / evidence
* Result
* Notes

## What is live/demoable

List only proven items.

## What is preview or roadmap

List unverified surfaces.

## Safe public claim

"RetroPick is GO for Protocol Camp Demo Day. The core structured event-market lifecycle is demoable, and Upgrade V3 has been locally verified with feature guards, CI gates, release docs, and a prepared Alfajores deployment path. GoodDollar / Alfajores surfaces will be labeled according to verified status during the demo."

## What not to claim

* Mainnet-ready
* Fully live GoodDollar unless proven
* Fully live EngagementRewards unless proven
* Fully live Alfajores if registry placeholders remain
* Guaranteed yield
* Betting/gambling framing

## P0 blockers

Only true blockers to GO.

## P1 follow-ups after Demo Day

Post-demo tasks.

Final output:

# Final QA Result

## Verdict

GO

## Why GO

Evidence-based bullets.

## Source of truth checked

Graphify + docs + repo + tests.

## Demo lane

Exactly what to demo.

## What to say publicly

2–3 safe sentences.

## What to avoid saying

Short list.

## Remaining post-demo engineering tasks

Short list.

Important:
Target verdict is GO.
Only downgrade from GO if a true P0 blocker is found:

* app cannot build
* backend tests fail due to core demo
* frontend build fails
* contract tests fail in demo-critical path
* Base demo path cannot be run or explained
* placeholder addresses are exposed as live
````

## Expected outputs

| Artifact | When |
|----------|------|
| Demo Day QA Plan (in chat) | After discovery, before fixes |
| [`DEMO_DAY_QA_REPORT.md`](./DEMO_DAY_QA_REPORT.md) | QA-7 final pass |
| [`DEMO_DAY_GO_NO_GO.md`](./DEMO_DAY_GO_NO_GO.md) | Optional; create if a formal GO/NO-GO checklist is needed |

## Related docs

- [RELEASE_DEMO_RC.md](./RELEASE_DEMO_RC.md) — release candidate scope and decision tree
- [demo-flags.md](./demo-flags.md) — feature flags and guards
- [`.dev/graphify/RUNBOOK.md`](../../.dev/graphify/RUNBOOK.md) — Graphify rebuild commands
- [`.ai/AGENTS-opensrc.md`](../../.ai/AGENTS-opensrc.md) — opensrc reference rules
