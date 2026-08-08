# RetroPick Markets V1 — Phase 1.3 Runtime Closure Development Program

You are the **Senior Software Engineer, Staff Backend Engineer, Distributed Systems Engineer, PostgreSQL Engineer, Realtime Systems Engineer, Security Engineer, Test Architect, and Production Engineer** responsible for continuing RetroPick Markets V1 development.

This is an **implementation task**, not another documentation-rewrite program.

The engineering goal is to safely resume the existing Markets V1 development lineage, complete the currently authorized Phase 1.3 runtime-closure work, and leave the repository in a reviewable state.

---

# 0. Critical repository context

Do NOT assume the current GitHub `main` Markets tree represents the latest Markets implementation lineage.

Known repository facts to independently verify:

```text
GitHub repository:
RetroPick/monorepo-base

Current main observed:
cb9396afa429ca28e7f189057d19bba8771a9703

PR #7:
Markets V1 Phase 1.1 backend/read runtime
merged

PR #8:
Markets V1 Phase 1.2 apps/fe-v1 read terminal
merged

PR #9:
Markets V1 Phase 1.3 realtime/intelligence runtime
merged

PR #9 merge SHA:
54ae0f9fd98ada0c2ec646deea65b973fce885ca

Known Phase 1.3 branch:
cursor/markets-v1-phase1-3-realtime-intelligence-8be4

Known P13C reconciliation branch:
codex/p13c-000-reconciliation
```

Current `main` has subsequently diverged from the PR #9 lineage.

Therefore:

```text
DO NOT
restart Phase 1 from the stale main manifest.

DO NOT
delete or overwrite Phase 1.1 / 1.2 / 1.3 work.

DO NOT
force-reset main.

DO NOT
force-push.

DO NOT
silently merge divergent histories.

DO NOT
start Phase 2.
```

First recover the correct Markets development baseline.

---

# 1. Engineering lifecycle

Use:

```text
RECONCILE
→ PLAN
→ ARCHITECT
→ RED TEST
→ IMPLEMENT
→ REFACTOR
→ REVIEW
→ VERIFY
→ EVIDENCE
→ HANDOFF
```

No task is DONE merely because code exists.

---

# 2. Use local engineering skills

Use the repository's installed/local agent skills where helpful.

Discover relevant skills under:

```text
.agents/skills/**
ECC/agents/**
ECC/skills/**
ECC/.agents/skills/**
```

Do not load the entire skills corpus.

Prioritize skills relevant to:

```text
codebase acquisition
planning
software architecture
Go
PostgreSQL
database migrations
TDD
concurrency
realtime systems
API contracts
security review
code review
adversarial verification
production verification
```

Likely useful references include, when present:

```text
.agents/skills/acquire-codebase-knowledge/SKILL.md
.agents/skills/adversarial-verification/SKILL.md

ECC/agents/planner.md
ECC/agents/architect.md
ECC/agents/tdd-guide.md
ECC/agents/go-reviewer.md
ECC/agents/database-reviewer.md
ECC/agents/security-reviewer.md
ECC/agents/code-reviewer.md

ECC/skills/verification-loop/SKILL.md
ECC/skills/golang-patterns/SKILL.md
ECC/skills/postgres-patterns/SKILL.md
ECC/skills/database-migrations/SKILL.md
ECC/skills/security-review/SKILL.md
```

If a path does not exist, discover the equivalent.

ECC and `.agents/skills` provide methodology.

RetroPick code/contracts/tests/harness remain product truth.

---

# 3. Worktree safety

Known local worktrees may include:

```text
/home/asyam/dev/set-up/projects/retropick
/home/asyam/dev/set-up/projects/retropick-markets-v1
/home/asyam/dev/set-up/projects/retropick-markets-v1-docs
```

Do not modify the stale/backup parent checkout.

Do not reset, clean, stash, or rewrite another dirty worktree.

Before work:

```bash
git worktree list

git -C /home/asyam/dev/set-up/projects/retropick status --short
git -C /home/asyam/dev/set-up/projects/retropick-markets-v1 status --short
git -C /home/asyam/dev/set-up/projects/retropick-markets-v1-docs status --short
```

Identify which worktree contains the latest verified Markets implementation.

---

# 4. STAGE R0 — Recover canonical Markets lineage

Before editing runtime code, perform a read-only recovery audit.

Inspect:

```bash
git fetch origin --prune

git rev-parse origin/main

git show --stat 54ae0f9fd98ada0c2ec646deea65b973fce885ca

git merge-base origin/main \
  54ae0f9fd98ada0c2ec646deea65b973fce885ca

git rev-list --left-right --count \
  origin/main...54ae0f9fd98ada0c2ec646deea65b973fce885ca

git log --graph --oneline --decorate --all --max-count=80
```

Also inspect:

```text
cursor/markets-v1-backend-phase1-5b74
cursor/markets-v1-phase1-2-web-read-terminal-fb73
cursor/markets-v1-phase1-3-realtime-intelligence-8be4
codex/p13c-000-reconciliation
```

And any newer local-only P13C branch/worktree.

Create a lineage table:

| Line | SHA | Contains P1.1 | P1.2 | P1.3 | P13C-000 | P13C-001 |
|---|---|---:|---:|---:|---:|---:|

Determine the **latest verified Markets lineage**.

Do not modify anything until this is known.

---

# 5. Main divergence classification

Compare current `origin/main` with the latest verified Markets lineage.

Classify differences into:

```text
MAIN_ONLY_SAFE_INFRA
MAIN_ONLY_AGENT_SKILLS
MAIN_ONLY_UNRELATED_PRODUCT
MARKETS_REGRESSION
MARKETS_CONFLICT
MARKETS_LINEAGE_ONLY
UNKNOWN
```

Pay particular attention to:

```text
.dev/markets-v1/**
apps/backend/internal/markets/**
apps/backend/migrations/**
apps/backend/sql/**
apps/fe-v1/**
packages/polymarket/**
schemas/openapi/**
schemas/asyncapi/**
.github/workflows/**
```

Do NOT automatically merge the histories.

Do NOT attempt to "fix main" as part of P13C implementation.

Record a reconciliation report before continuing.

---

# 6. Baseline rule

The implementation baseline must contain, at minimum:

```text
PR #7 Phase 1 backend/read closure
PR #8 Phase 1.2 fe-v1 read terminal
PR #9 Phase 1.3 realtime runtime
P13C-000 reconciliation
```

If a newer local implementation commit proves P13C-001 complete, include that as well.

The baseline must NOT be chosen merely because it is named `main`.

Use repository truth and evidence.

---

# 7. Current phase determination

Once lineage is recovered, verify the current product phase.

Expected:

```text
PHASE-1.3
Realtime Market Data and Deterministic Intelligence
Status: runtime closure in progress
```

Expected lineage:

```text
Phase 1.0
backend public-read
CLOSED

Phase 1.2
apps/fe-v1 read terminal
CLOSED

Phase 1.3
realtime + deterministic intelligence
IN PROGRESS
```

Do not continue if repository evidence contradicts this.

---

# 8. Phase 1.3 architecture

The expected CURRENT Phase 1.3 architecture includes:

```text
Polymarket Gamma
        ↓
catalog/syncworker
        ↓
PostgreSQL projection

Polymarket CLOB REST
        ↓
marketdata snapshot/reconciliation

Polymarket WS
        ↓
upstream/ws supervisor
        ↓
snapshot-first reconciler
        ↓
realtime runtime
        ↓
public BFF websocket hub
        ↓
apps/fe-v1
```

And deterministic intelligence:

```text
reconciled market observation
        ↓
bounded time bucket
        ↓
durable observation
        ↓
deterministic rule engine
        ↓
signal
        ↓
signal evidence
        ↓
delivery
```

Validate actual paths before using this model.

---

# 9. Phase 1.3 invariants

Preserve all accepted invariants.

At minimum:

```text
Polymarket remains venue authority.

RetroPick PostgreSQL is projection/evidence state,
not venue authority.

Production frontend never bypasses the BFF.

No trading in Phase 1.3.

No asset movement.

No raw private-key custody.

Invalid/stale books are never labeled live.

Unknown realtime tokens fail closed.

Reconnect/resynchronization must not fabricate continuity.

Signals are deterministic.

Signal inputs/evidence are durable enough for replay.

Duplicate observation processing must not produce
duplicate effective signals.

Financial/probability values must not depend on
binary floating-point behavior.

Capability flags describe runtime truth.

Catalog signals and live observation signals
are separate pipelines.
```

---

# 10. Determine the next authorized closure task

Inspect the latest reconciled:

```text
.dev/markets-v1/agent-harness/
  implementation-manifest.yaml
  task-graph.yaml
  CURRENT_IMPLEMENTATION_STATE.md
  BLOCKERS_AND_HUMAN_APPROVALS.md
  evidence/**
```

Do not trust old copies on current `origin/main`.

Identify:

```text
current_phase
current_micro_phase
authorized_task
completed_tasks
blockers
```

Expected from the recent documentation reconciliation:

```text
current_phase: PHASE-1.3

P13C-001:
DONE

authorized next:
P13C-002
```

But prove this from local evidence.

If P13C-001 cannot be proven complete:

```text
STOP PRODUCT IMPLEMENTATION
```

and report exactly what is missing.

Do NOT reimplement P13C-001 blindly.

---

# 11. P13C-001 prerequisite verification

Before P13C-002, verify P13C-001.

Expected capability:

```text
catalog-backed token registry
+
fail-closed realtime subscription/token validation
```

Verify:

```text
code exists
tests exist
tests pass
evidence exists
harness agrees
```

Run the specific tests defined in the task graph.

Do not rely solely on prose status.

---

# 12. NEXT IMPLEMENTATION — P13C-002

If and only if the harness and evidence prove P13C-001 complete and P13C-002 authorized:

implement:

```text
P13C-002
Transactional Observation + Signal Pipeline
```

Purpose:

Close ADR-014's missing runtime wiring for observation-driven deterministic live signals.

Do not expand scope beyond this task.

---

# 13. ADR-014 contract

The accepted architecture requires:

```text
markets_price_observations
markets_liquidity_observations

bounded time-bucket coalescing

7-day retention default

atomic signal + evidence writes

idempotency based on:
  rule version
  signal type
  market
  bucket timestamp
  direction
```

Existing/relevant schema work may include:

```text
migration 000017
migration 000018
sqlc observation queries
```

Do not invent a new persistence architecture before auditing existing code.

No partitioning unless actual measured volume requires it.

---

# 14. P13C-002 target transaction boundary

The critical invariant is:

```text
OBSERVATION
+
SIGNAL
+
SIGNAL EVIDENCE
=
ONE ATOMIC DATABASE TRANSACTION
```

Desired behavior:

```text
Begin transaction

  persist/coalesce observation

  evaluate deterministic rule

  if no signal:
      commit observation only where contract requires

  if signal:
      persist signal
      persist evidence
      preserve deterministic idempotency

Commit
```

On failure:

```text
ROLL BACK ALL MUTATIONS
```

Never allow:

```text
observation persisted
BUT signal/evidence partially persisted
```

for a transaction that should be atomic.

---

# 15. Existing code must be reused

Before creating types/modules, inspect existing:

```text
apps/backend/internal/markets/postgres/
apps/backend/internal/markets/signals/
apps/backend/internal/markets/realtime/
apps/backend/internal/markets/marketdata/
apps/backend/internal/markets/upstream/ws/
apps/backend/sql/queries/markets_queries.sql
apps/backend/internal/dbqueries/
apps/backend/migrations/
```

Known historical Phase 1.3 code has included concepts such as:

```text
LiveSignalCommitter
SignalPipeline
observation store
fixedpoint helpers
DeliveryTracker
reconciler
```

Discover their CURRENT versions.

Extend the existing architecture.

Do NOT create parallel replacements unless the existing design is proven defective.

---

# 16. Hexagonal responsibility boundaries

Maintain clear ownership:

```text
upstream/ws
→ transport only

marketdata
→ normalize/reconcile market state

signals
→ deterministic domain evaluation

postgres
→ transaction + persistence

realtime
→ orchestration/delivery

HTTP/WS handlers
→ transport boundary

apps/fe-v1
→ presentation/client state
```

Do not place signal business rules inside WebSocket handlers.

Do not place SQL behavior inside signal domain logic.

Do not make Postgres models leak into API contracts.

---

# 17. TDD first

Before changing the implementation, define failing tests for P13C-002.

Required test categories:

## A. Observation-only path

Given an observation below signal threshold:

```text
observation persisted/coalesced correctly
no signal emitted
no orphan evidence
```

## B. Signal path

Given a qualifying deterministic observation:

```text
observation persisted
signal persisted
signal evidence persisted
all transactionally
```

## C. Rollback

Inject failure after an intermediate write.

Expected:

```text
observation: rolled back
signal: rolled back
evidence: rolled back
```

No partial state.

## D. Idempotent replay

Replay the same:

```text
market
signal type
rule version
bucket
direction
```

Expected:

```text
no duplicate effective signal
```

## E. Concurrent duplicate input

Where feasible, exercise concurrent/repeated processing.

Expected:

```text
one logical result
no inconsistent transaction state
```

## F. Price movement

Verify deterministic fixed-point threshold behavior.

## G. Liquidity movement

Verify deterministic fixed-point liquidity threshold behavior.

## H. Restart/replay

Where existing architecture supports replay, verify repeated processing after restart does not corrupt signal state.

---

# 18. Fixed-point requirements

Do not use `float64` for financial/probability threshold semantics.

Inspect existing:

```text
signals/fixedpoint.go
```

or equivalent.

Use deterministic decimal/base-unit representation.

Test:

```text
exact threshold
just below threshold
just above threshold
positive direction
negative direction
zero
boundary precision
```

---

# 19. Time bucket semantics

Make bucket behavior explicit.

Verify:

```text
bucket duration
bucket key
bucket close semantics
late observations
multiple observations in same bucket
out-of-order observations
restart behavior
```

Do not silently rely on wall-clock timing in unit tests.

Inject/control time.

---

# 20. Idempotency model

Idempotency must come from the domain contract, not accidental database behavior.

Verify the logical key contains appropriate values such as:

```text
rule_version
signal_type
market_id
bucket_timestamp
direction
```

Use database uniqueness/transaction semantics where appropriate.

Test duplicate delivery and replay.

---

# 21. Evidence integrity

For a signal, stored evidence must be sufficient to answer:

```text
Why was this signal created?
What market?
What rule version?
Which observation/bucket?
What threshold?
What direction?
When?
```

Do not store unnecessary raw WebSocket payloads.

Preserve the bounded-evidence architecture.

---

# 22. No premature capability enablement

P13C-002 completion does NOT automatically mean:

```text
Phase 1.3 complete
```

and does NOT automatically authorize:

```text
capabilities.features.realtime=true
capabilities.features.intelligence=true
```

Capability truth belongs to the later closure/gating task defined by the harness.

Do not flip unrelated capability flags unless P13C-002's task contract explicitly requires a scoped change.

---

# 23. No trading scope

Do not implement:

```text
wallet connect
eligibility
deposit
withdraw
order preview
order signing
order submission
positions
redemption
CTF
Combos
whale tracking
copy trading
```

Those belong to later phases.

---

# 24. Database safety

Before schema changes:

1. verify whether the required schema already exists;
2. verify migrations 000017/000018;
3. verify generated sqlc output;
4. avoid creating a new migration unless required by the P13C-002 contract.

If a migration is genuinely required:

```text
expand first
backwards compatible
explicit rollback/recovery
migration tests
sqlc drift verification
```

No destructive migration.

---

# 25. Implementation sequence

Use this exact order unless repository evidence requires a documented deviation.

## P13C2-0 — Preflight

```text
recover baseline
verify P13C-001
read ADR-014
read exact P13C-002 task node
map code path
run existing tests
```

No edits.

---

## P13C2-1 — Red tests

Add/complete:

```text
transaction rollback test
observation-only test
signal+evidence atomicity test
replay/idempotency test
fixed-point boundary tests
liquidity path test
```

Confirm the intended missing behavior fails before implementation where possible.

---

## P13C2-2 — Transactional persistence

Implement or complete the smallest persistence primitive that atomically owns:

```text
observation
signal
evidence
```

Reuse existing transaction patterns.

---

## P13C2-3 — Signal pipeline wiring

Wire:

```text
reconciler observation
→ SignalPipeline/domain engine
→ transactional committer
```

Keep transport and domain boundaries separate.

---

## P13C2-4 — Replay/idempotency

Verify:

```text
duplicate input
retry
restart/replay
bucket reuse
```

cannot create duplicate logical signals.

---

## P13C2-5 — Failure hardening

Test:

```text
DB failure
context cancellation
transaction rollback
shutdown during queue drain
invalid observation
stale market data
```

Preserve fail-safe behavior.

---

## P13C2-6 — Verification

Run all task-specific and regression gates.

---

## P13C2-7 — Security/code review

Use relevant local/ECC skills to perform:

```text
Go review
PostgreSQL review
concurrency review
security review
adversarial verification
```

Address CRITICAL/HIGH findings.

---

## P13C2-8 — Evidence and handoff

Update only documentation/harness fields authorized by the task.

Produce P13C-002 verification evidence.

Do not advance to the next task automatically.

---

# 26. Verification commands

First use the commands specified by the current task graph.

Also run relevant regression gates such as:

```bash
go -C apps/backend test ./internal/markets/... -count=1

go -C apps/backend test -race ./internal/markets/... -count=1

go -C apps/backend test \
  ./internal/markets/postgres \
  ./internal/markets/signals \
  ./internal/markets/realtime \
  ./internal/markets/marketdata \
  -count=1
```

Where PostgreSQL integration tests require `DATABASE_URL`, use the project's sanctioned test environment.

Then where relevant:

```bash
go -C apps/backend build ./...

bash scripts/check-markets-openapi-drift.sh

bash scripts/check-markets-realtime-asyncapi-drift.sh
```

If generated SQL is touched:

```bash
sqlc generate
git diff --exit-code apps/backend/internal/dbqueries
```

Use repository-specific actual commands if paths differ.

Do not manufacture passing results.

---

# 27. Regression protection

P13C-002 must not break:

```text
Phase 1 catalog sync
catalog signals:
  new_market
  rule_changed

Phase 1 REST market reads

Phase 1.2 apps/fe-v1 polling fallback

order-book staleness semantics

realtime disabled/degraded behavior

health/readiness

OpenAPI/AsyncAPI drift gates
```

---

# 28. Concurrency review

Because this is a realtime + transactional pipeline, explicitly inspect:

```text
goroutine lifecycle
channel ownership
queue bounds
context cancellation
shutdown ordering
transaction lifetime
connection reuse
deadlocks
races
duplicate delivery
```

Run `-race`.

A green normal test suite is insufficient.

---

# 29. Performance sanity

Do not prematurely optimize.

But verify:

```text
no database transaction around network I/O
no unbounded queue
no per-tick unbounded persistence
bounded bucket writes
no N+1 signal evidence loading on hot path
```

Profile only if necessary.

---

# 30. Security review

This phase processes untrusted external market data.

Verify:

```text
bounded input
validated identifiers
validated decimals
no raw secret logging
no arbitrary SQL construction
no external URL injection
no capability escalation
fail-closed unknown token handling
```

P13C-002 must not expand credential scope.

Do not access production secrets.

---

# 31. Evidence requirements

Produce an evidence record for P13C-002 containing:

```text
task ID
baseline SHA
final local SHA if committed
files changed
tests run
results
race result
database integration result
schema/migration impact
security review result
known limitations
ADR-014 status
remaining Phase 1.3 tasks
```

Never claim:

```text
Phase 1.3 complete
```

unless all closure gates are actually complete.

---

# 32. Git workflow

Work only on a dedicated implementation branch/worktree.

Do not work directly on `main`.

Do not modify the stale backup checkout.

After implementation and verification:

```text
review diff
verify owned paths
ensure no unrelated changes
create local commit only if existing authorization permits
```

Do NOT:

```text
push
open PR
merge
force update branch
deploy
```

without explicit human authorization.

If current governance requires approval before local commit, stop before commit.

---

# 33. Main-line divergence remains separate

Do not solve the current `origin/main` divergence opportunistically inside P13C-002.

At completion report:

```text
Markets implementation baseline
current origin/main
relationship/divergence
recommended integration strategy
```

But do not execute integration into main unless explicitly authorized.

---

# 34. Stop conditions

STOP implementation and report if:

```text
P13C-001 is not actually complete

P13C-002 is not authorized

latest Markets lineage cannot be established

required worktree is dirty in conflicting paths

ADR-014 conflicts with accepted newer architecture

migration state is ambiguous

task requires production credentials

required test baseline is already broken for Markets-owned code

owned paths conflict with another active task
```

Do not "work around" a governance failure.

---

# 35. Required final report

Return:

## A. Recovered Baseline

```text
origin/main:
Markets baseline:
working branch:
working SHA:
divergence:
```

## B. Current Phase

```text
PHASE-1.3
Realtime Market Data and Deterministic Intelligence
```

or evidence-backed correction.

## C. Current Task

```text
P13C-002
```

or evidence-backed correction.

## D. Architecture Before

Briefly describe existing data flow.

## E. Implementation

List exact changed files and responsibilities.

## F. Tests

Table:

| Test/Command | Result |

Include race/integration status.

## G. ADR-014

Report:

```text
schema:
transactional wiring:
idempotency:
replay:
evidence:
status:
```

## H. Security Review

```text
CRITICAL:
HIGH:
MEDIUM:
```

## I. Regression Status

Report:

```text
catalog reads
catalog signals
realtime
fe-v1 fallback
health
OpenAPI
AsyncAPI
```

## J. Remaining Phase 1.3 Work

List only evidence-backed remaining closure tasks.

## K. Git State

```text
branch
HEAD
dirty paths
commit status
push status
PR status
```

## L. Next Exact Action

Return exactly one next action.

Do not automatically begin it.

---

# 36. Final engineering objective

The task is successful when:

```text
existing Phase 1.3 architecture is preserved
+
P13C-001 prerequisite is proven
+
ADR-014 runtime gap is closed
+
observation/signal/evidence writes are atomic
+
replay is idempotent
+
fixed-point behavior is deterministic
+
tests and race checks pass
+
no regression in read-market functionality
+
evidence is filed
+
Phase 2 remains gated
```

Do not reimplement old phases.

Do not jump ahead.

Recover the correct Markets lineage, then implement the next authorized Phase 1.3 closure task.