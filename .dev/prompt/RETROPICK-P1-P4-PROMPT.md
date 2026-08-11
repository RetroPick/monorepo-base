# RETROPICK MARKETS V1 — PHASE 1–4 RECOVERY, COMPLETION & SYSTEM-PROOF PROGRAM
## GPT-5.6 Sol xhigh — PLAN MODE
### Fix Every Audit Finding → Complete Every Remaining Phase Task → Prove the Integrated System

You are **GPT-5.6 Sol operating at xhigh reasoning depth**.

Act simultaneously as:

- Principal Software Engineer
- Staff Go Backend Engineer
- Distributed Systems Architect
- Prediction Market / Polymarket Integration Engineer
- Trading Systems Engineer
- Wallet / Authentication Security Engineer
- PostgreSQL / Data Consistency Engineer
- Staff TypeScript / React Engineer
- API / OpenAPI Architect
- QA Architect
- Senior SDET
- Reliability Engineer
- Chaos Engineer
- Security Reviewer
- Production Readiness Reviewer

Your assignment is to produce the **implementation-grade recovery plan** for RetroPick Markets V1 Phase 1 through Phase 4.

The governing objective is:

```text
AUDIT NO-GO
    ↓
repair every verified defect
    ↓
recover architecture invariants
    ↓
finish every missing canonical P1–P4 task
    ↓
integrate the phases
    ↓
run adversarial QA
    ↓
prove every phase exit gate
    ↓
independent P1–P4 re-audit
```

This is NOT just:

```text
fix the ten audit bullets
```

It is:

```text
fix all audit findings
+
finish all legitimately missing Phase 1–4 work
+
wire the system end-to-end
+
test failure/recovery paths
+
prove that the completed system works
```

---

# 1. MODE

You are in:

```text
PLAN MODE ONLY
```

During this turn:

DO NOT modify source code.

DO NOT modify migrations.

DO NOT regenerate clients.

DO NOT modify docs.

DO NOT commit.

DO NOT push.

DO NOT open a PR.

DO NOT deploy.

DO NOT submit Polymarket orders.

DO NOT move funds.

DO NOT perform CTF mutations.

Your output must be sufficiently detailed that the next execution agent can perform:

```text
ANALYZE
→ TEST FIRST
→ IMPLEMENT
→ REVIEW
→ VERIFY
→ REPEAT
```

without re-architecting the program.

---

# 2. PRIMARY SOURCES OF TRUTH

Read these FIRST.

## Audit authority

Locate:

```text
.dev/RETROPICK-P1-P4-SYSTEM-AUDIT.md
```

If not present, use the supplied audit document from the current task/context.

The known audit baseline was:

```text
main
3ec4425a3cb57ff473999a234dfef94b3c6d2c38
```

Known verdict:

```text
Phase 1             PARTIALLY VERIFIED
Phase 2             INCOMPLETE
Phase 3             INCOMPLETE / REGRESSED
Phase 4             NOT IMPLEMENTED / INCOMPLETE
Integrated P1–P4    NO-GO
```

Treat the audit's S0–S4 findings and QA-001…QA-020 remediation recommendations as a required backlog.

Do not selectively ignore inconvenient audit findings.

---

# 3. CANONICAL PHASE SPECS

Read completely:

```text
.dev/markets-v1/phases/PHASE-1-FOUNDATION-AND-READ-MARKETS.md

.dev/markets-v1/phases/PHASE-2-ACCOUNT-WALLET-AND-FUNDING.md

.dev/markets-v1/phases/PHASE-3-WEB-TRADING-CORE.md

.dev/markets-v1/phases/PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md
```

Also:

```text
.dev/markets-v1/phases/README.md

.dev/markets-v1/phases/PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md
```

Do not treat:

```text
Status: reviewed
```

as implementation completion.

Extract separately:

```text
SPEC STATUS
IMPLEMENTATION STATUS
TEST STATUS
INTEGRATION STATUS
EXIT-GATE STATUS
```

---

# 4. READ THE POLYMARKET REFERENCE MANUAL BEFORE PLANNING FIXES

Read completely:

```text
references/polymarket/README.md
```

or the canonical local equivalent.

This is mandatory before architecture planning.

Treat the repositories described there as specialized engineering references rather than dependencies.

Reference purposes:

```text
polymarket-ts-sdk
→ current protocol compatibility

polymarket-cli
→ complete lifecycle behavioral oracle

polymarket-wagmi-builder
→ wallet / Safe / deposit-wallet / approvals / relayer

humanplane-terminal
→ professional terminal + realtime UX

polymarket-trade-engine
→ order lifecycle + persistence + recovery

direktur-polymarket-terminal
→ ghost fills + execution inconsistency cases

polyrec
→ deterministic observations + replay

polymarket-orderbook-tui
→ minimal WS/parser behavior

polyterm
→ intelligence only, not Phase 1–4 execution authority

txbaba-polyterminal
→ UX/operations reference only
```

Do NOT merge or fork these repositories into RetroPick.

---

# 5. PROTOCOL AUTHORITY HIERARCHY

For protocol-sensitive behavior use:

```text
1. CURRENT official Polymarket documentation
2. CURRENT official Polymarket SDK
3. CURRENT official Polymarket CLI
4. CURRENT official Builder / Relayer examples
5. RetroPick verified fixtures
6. references/polymarket/README.md
7. third-party terminals
```

If local reference documentation conflicts with current official Polymarket:

```text
CURRENT OFFICIAL POLYMARKET WINS
```

The execution agent must revalidate protocol assumptions immediately before implementing them.

---

# 6. CURRENT HIGH-RISK POLYMARKET ITEMS TO REVALIDATE

Explicitly verify:

```text
CLOB V2 order format

market BUY amount semantics

market SELL shares semantics

makerAmount / takerAmount conversion

tick-size precision rules

market minimum-order-size rules

FAK / FOK behavior

market BUY maxPrice

market SELL minPrice

market BUY maxSpend / fee handling

standard vs Neg Risk Exchange address

signatureType 0 / 1 / 2 / 3

deposit-wallet POLY_1271

maker address

signer address

EIP-712 domain

EIP-712 version

timestamp semantics

metadata

builder attribution

orderType signed vs unsigned fields

CLOB L1/L2 authentication

Relayer authentication

deposit wallet derivation

balance/allowance synchronization

CTF split

CTF merge

CTF redeem

Neg Risk conversions
```

Do not implement from memory.

---

# 7. HARD SAFETY STATE

Until Phase 3 is independently verified:

```text
order_submission = OFF
trading_enabled = OFF
```

Until P4 is independently verified:

```text
ctf_mutations = OFF
redemption_mutations = OFF
withdrawal_mutations = OFF
```

Until relayer controls are verified:

```text
relayer_mutations = OFF
```

The repair program must preserve usable read-only Markets functionality wherever possible.

---

# 8. REPOSITORY RECOVERY AUDIT

Before proposing any implementation sequence determine the current truth.

Plan commands:

```bash
pwd

git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short
git worktree list
git submodule status
git log --graph --decorate --oneline --all -50
```

Identify:

```text
current main
origin/main
dirty original worktree
candidate staged tree
docs worktree
Markets worktrees
historical accepted Phase commits
regressed commits
```

Do not assume current main is automatically the best implementation baseline.

---

# 9. BASELINE SELECTION

The execution plan must identify the safest remediation baseline.

Compare:

```text
committed main
candidate staged tree
historical Phase 1/2/3 implementation branches
accepted merged commits
other Markets worktrees
```

For each candidate baseline measure:

```text
accepted functionality preserved
known regressions
missing phase work
testability
Git ancestry
uncommitted-risk
```

Do NOT:

```text
force reset main
discard dirty work
blindly cherry-pick staged candidate
```

Produce:

```text
RECOMMENDED REMEDIATION BASE SHA
RECOMMENDED WORKTREE
RECOMMENDED BRANCH
WHY THIS BASE IS SAFEST
```

---

# 10. GRAPHIFY THE SYSTEM

Before planning source changes, inspect available graph tooling:

```bash
command -v graphify || true

find . -maxdepth 3 \
  \( -iname '*graphify*' -o -path './graphify-out*' \) \
  -print
```

If repository-supported Graphify exists, use it read-only.

Do not install/upgrade it.

If unavailable, reconstruct equivalent graphs from:

```bash
go list -deps
go list -json
rg
git grep
OpenAPI references
migration dependencies
workspace package dependencies
```

---

# 11. REQUIRED GRAPH 1 — AUDIT FINDING DEPENDENCIES

Generate:

```text
AUDIT FINDING
    ↓
VIOLATED INVARIANT
    ↓
ROOT CAUSE
    ↓
DOMAIN MODULE
    ↓
DB / SCHEMA
    ↓
API
    ↓
WEB
    ↓
TEST
    ↓
PHASE TASK
    ↓
PHASE EXIT GATE
```

Example:

```text
duplicate submit
    ↓
one intent = one venue mutation
    ↓
non-atomic idempotency
    ↓
orders service
    ↓
order intent uniqueness
    ↓
POST /orders
    ↓
OrderTicket retry state
    ↓
2/10/100 concurrency test
    ↓
MKT-P3-002 / 005
    ↓
MKT-P3-010
```

---

# 12. REQUIRED GRAPH 2 — PHASE DEPENDENCIES

Build exact graph:

```text
P1 READ TRUTH
   │
   ├── catalog
   ├── book
   ├── freshness
   └── realtime
        │
        ▼
P2 IDENTITY / FUNDING
   │
   ├── auth
   ├── eligibility
   ├── signer
   ├── funder
   ├── approvals
   └── funding
        │
        ▼
P3 EXECUTION
   │
   ├── preview
   ├── sign
   ├── durable intent
   ├── submit
   ├── fill
   ├── cancel
   └── reconciliation
        │
        ▼
P4 ASSET LIFECYCLE
   │
   ├── positions
   ├── accounting
   ├── CTF
   ├── redemption
   └── withdrawal
```

Highlight broken edges.

---

# 13. REQUIRED GRAPH 3 — FINANCIAL EVIDENCE FLOW

Graph:

```text
User Intent
   ↓
Preview
   ↓
User Signature
   ↓
Order Intent
   ↓
Order Attempt
   ↓
CLOB
   ↓
Venue Order
   ↓
Fill
   ├─────────────┐
   ▼             ▼
Data API       Chain / CTF
   │             │
   └──────┬──────┘
          ▼
    Reconciliation
          ▼
     Position Ledger
          ▼
       Portfolio
          ▼
        CTF
          ▼
   Redeem / Withdraw
```

Mark authority at every node.

---

# 14. INVENTORY ECC

Read available local:

```text
ECC/**
```

Start with:

```bash
find ECC -maxdepth 4 \
  \( -name 'AGENTS.md' -o -name '*.md' -o -name 'SKILL.md' \) \
  -print | sort
```

Expected useful methodology when present:

```text
ECC/AGENTS.md

ECC/agents/spec-miner.md
ECC/agents/planner.md
ECC/agents/architect.md
ECC/agents/tdd-guide.md
ECC/agents/code-reviewer.md
ECC/agents/security-reviewer.md
ECC/agents/typescript-reviewer.md

ECC/skills/verification-loop/SKILL.md
ECC/skills/production-audit/SKILL.md
```

ECC is READ-ONLY guidance.

Do not copy it into runtime.

If a named resource is absent:

```text
NOT FOUND
```

and continue.

---

# 15. INVENTORY `.agents/skills/*`

Run:

```bash
find .agents/skills -name 'SKILL.md' -print | sort
```

Read every skill relevant to touched work.

Do not invent skills.

Map skills to remediation tasks.

Required output:

| Repair area | Skills | ECC agent | Why |
|---|---|---|---|

---

# 16. TRUTH HIERARCHY

When sources conflict:

```text
1. Executed accepted behavior
2. deterministic tests
3. executable source
4. OpenAPI / AsyncAPI / migrations / SQL
5. CI
6. verification evidence
7. ADR
8. phase specification
9. manifest/task graph
10. prose
```

Do not allow stale harness status to override working code.

Do not allow working code to override explicit financial invariant failure.

---

# 17. AUDIT FINDINGS ARE MANDATORY REPAIR WORK

Treat every audit finding as a ticket.

Known critical findings include:

```text
COR-01 S0
concurrent idempotency permits multiple venue submissions

COR-02 S0
intent/attempt persisted after external effect

COR-03 S1
CLOB V2 BUY/signature/wire semantics incorrect

COR-04 S1
position reconciliation can erase stronger fill evidence

COR-05 S1
stale Gamma cache can appear fresh

COR-06 S1
realtime capability can disable polling without web subscriber

COR-07 S1
funding/PnL/CTF/redemption/withdrawal absent

COR-08 S2
generated TypeScript stale

SEC-01 S1
SIWE domain policy fail-open

SEC-02 S1
unproved account/deposit wallet binding

REL-01 S1
restart can lose execution state

TST-01 S1
missing atomic idempotency gate

TST-02 S1
missing official CLOB V2 differential gate

TST-03 S1
mock E2E overstated

TST-04 S1
Markets web unit tests skipped in CI
```

Also include every other S2–S4 finding from the complete audit.

---

# 18. DO NOT FIX SYMPTOMS ONLY

For every audit issue identify:

```text
symptom
root cause
violated invariant
architectural owner
minimum safe fix
downstream affected tasks
regression tests
failure tests
```

Example:

```text
Symptom:
duplicate CLOB submissions

Bad fix:
add frontend disable button

Root fix:
transactional server-side idempotency
+
durable order intent
+
DB uniqueness
+
attempt state
+
reconciliation
```

---

# 19. PRIORITY ORDER

Use:

```text
financial/security risk
×
probability
×
blast radius
×
lack of detection
```

Expected priority:

```text
P0-A  submission kill switches / baseline truth

P0-B  CLOB V2 protocol correctness

P0-C  authentication / wallet identity

P0-D  durable order intent + idempotency

P0-E  ambiguous submit + cancel/fill reconciliation

P1-A  realtime/freshness correctness

P1-B  position evidence hierarchy

P1-C  funding

P1-D  accounting / portfolio

P1-E  CTF / redemption / withdrawal

P2-A  OpenAPI/client truth

P2-B  full web integration

P2-C  CI + system QA

P3    phase exit proof
```

Refine ordering only if dependency graph proves otherwise.

---

# 20. PHASE 1 — REPAIR + COMPLETE

Canonical tasks:

```text
MKT-P1-001 OpenAPI markets-v1 expansion
MKT-P1-002 Gamma catalog client hardening
MKT-P1-003 Markets database schema v1
MKT-P1-004 Web markets read routes
MKT-P1-005 Signal schema foundation
MKT-P1-006 Realtime snapshot and gap recovery
MKT-P1-007 Android scaffold plan
MKT-P1-008 Contract conformance tests
MKT-P1-009 Observability baseline
MKT-P1-010 PHASE-1 exit gate
```

Do not rewrite P1 from scratch.

Audit the existing implementation task by task.

Classify each:

```text
KEEP
FIX
COMPLETE
REWIRE
RETEST
REGENERATE
BLOCKED
```

---

# 21. P1 AUDIT DEFECT — GAMMA FRESHNESS

Root requirement:

```text
cache age
!=
new observation age
```

A stale cached upstream response must not acquire:

```text
fresh observedAt
```

just because RetroPick persisted/read it later.

Plan:

```text
sourceObservedAt
sourceFetchedAt
projectionUpdatedAt
servedAt
```

or equivalent explicit provenance.

Test:

```text
fresh upstream
cached within allowed window
cached stale
Gamma outage with last-good
projection over max stale
```

User must see accurate stale/degraded state.

---

# 22. P1 AUDIT DEFECT — REALTIME / POLLING

Backend realtime capability must not imply working client consumption.

Required truth:

```text
backend websocket available
+
client subscribed
+
snapshot valid
+
stream integrity valid
=
frontend realtime healthy
```

Only then may polling frequency be reduced.

Otherwise:

```text
polling_fallback
```

remains.

Test:

```text
no browser subscriber
subscription failure
snapshot failure
delta-before-snapshot
gap
disconnect
browser sleep
foreground recovery
```

---

# 23. P1 EXIT PROOF

P1 cannot exit until:

```text
canonical market visible through BFF
Gamma freshness truthful
orderbook snapshot-first
gap → resync
browser realtime/fallback verified
OpenAPI current
web read tests current
contract tests current
observability current
```

No wallet/trade proof required for P1.

---

# 24. PHASE 2 — REPAIR + COMPLETE

Canonical tasks:

```text
MKT-P2-001 Wallet connect and session auth
MKT-P2-002 Fail-closed eligibility
MKT-P2-003 Account wallet discovery
MKT-P2-004 Token approvals
MKT-P2-005 Balance projections
MKT-P2-006 Deposit flow
MKT-P2-007 Withdrawal preview
MKT-P2-008 Funding notifications
MKT-P2-009 Relayer sandbox
MKT-P2-010 PHASE-2 exit gate
```

The current system must be repaired AND the absent funding lifecycle completed.

---

# 25. P2 — SIWE MUST FAIL CLOSED

Known defect:

```text
missing allowed-domain configuration
→ authentication can succeed
```

Required:

```text
missing policy
wrong domain
wrong URI
wrong chain
expired nonce
replayed nonce
wallet mismatch
=
DENY
```

Consider startup failure for mandatory production auth policy.

---

# 26. P2 — SIGNER / FUNDER / ACCOUNT WALLET

Never trust:

```text
request.accountWallet
request.funder
request.depositWallet
```

merely because the client submitted it.

Model:

```text
AuthenticatedUser
SessionSigner
OrderSigner
Funder
WalletType
SignatureType
AccountWallet
DepositWallet
Proxy/Safe
```

Each relation must be derived or cryptographically/protocol proven.

---

# 27. P2 — CURRENT WALLET MODES

Execution plan must account for current official wallet models, including where supported:

```text
EOA
POLY_PROXY
GNOSIS_SAFE
POLY_1271 deposit wallet
```

Do not force all users into one model if official Polymarket continues supporting legacy Proxy/Safe accounts.

Explicitly design:

```text
walletType
signatureType
maker
signer
funder
```

mapping.

---

# 28. P2 — APPROVAL READINESS

Readiness must distinguish:

```text
wallet connected
correct chain
session valid
funder proven
wallet deployed
collateral balance
conditional-token balance
allowance
operator approval
eligibility
CLOB auth
relayer capability
```

Do not collapse these into:

```text
ready: true
```

without evidence.

---

# 29. P2 — FUNDING FSM

The audit reports no complete deposit lifecycle.

Plan a durable state machine using current official Polymarket funding mechanism.

Example conceptual states:

```text
created
awaiting_user_action
submitted
observed
pending_confirmation
confirmed
projecting
reconciled
failed
unknown
reorged
```

Do not freeze state names before inspecting existing domain patterns.

Required properties:

```text
idempotent
restart-safe
reorg-aware
identity-bound
observable
```

---

# 30. P2 — FUNDING TESTS

Plan:

```text
duplicate observation
duplicate callback
receipt delay
RPC timeout
reorg
wrong destination
wrong user
restart before confirmation
restart after confirmation
reconcile lag
```

Assert:

```text
no double credit
```

---

# 31. P2 — WITHDRAWAL PREVIEW

This phase requires preview, not complete asset exit.

Preview must contain:

```text
source
destination
asset
amount
network
expected fee/cost where applicable
capability
policy
eligibility
expiry
```

Do not mutate funds in P2 preview.

---

# 32. P2 — FUNDING NOTIFICATIONS

Implement notifications only from durable state transitions.

No duplicate notification after worker retry.

Test:

```text
same event observed twice
worker restart
delivery retry
```

---

# 33. P2 — RELAYER SANDBOX

Before any Relayer mutation:

prove:

```text
allowed transaction type
allowed destination
allowed function
budget
rate limit
user authorization
audit trail
kill switch
```

Builder/Relayer secrets:

```text
SERVER ONLY
```

Do not infer CLOB order-signing rules from Relayer auth rules.

---

# 34. P2 EXIT PROOF

Require:

```text
SIWE fail closed
signer/funder relation proven
wallet-mode vectors
eligibility failure vectors
approval readiness vectors
funding FSM
duplicate/reorg/restart funding tests
withdrawal preview
funding notifications
relayer sandbox controls
```

No CLOB submit required.

---

# 35. PHASE 3 — REPAIR + COMPLETE

Canonical tasks:

```text
MKT-P3-001 Order preview
MKT-P3-002 CLOB V2 submission
MKT-P3-003 Open orders and fills
MKT-P3-004 Order cancellation
MKT-P3-005 Reconciliation worker
MKT-P3-006 ARCHIVED / DO NOT IMPLEMENT
MKT-P3-007 Web order ticket UX
MKT-P3-008 Neg Risk routing
MKT-P3-009 Web E2E trading
MKT-P3-010 PHASE-3 exit gate
```

Phase 3 currently contains the most dangerous defects.

---

# 36. P3 — CLOB V2 DIFFERENTIAL FIRST

Before rewriting order submission create compatibility tests against current official SDK behavior.

Required vectors:

```text
limit BUY
limit SELL

market BUY
market SELL

FAK
FOK

standard market
Neg Risk market

EOA
Proxy
Safe
Deposit Wallet / POLY_1271
```

Not every wallet mode must be enabled at launch, but unsupported modes must be explicit.

---

# 37. P3 — MARKET ORDER DOMAIN TYPES

Avoid ambiguous API:

```text
amount
size
quantity
```

when meaning depends on side.

Domain intent should make explicit:

```text
MarketBuy {
    spendNotional
    maxSpend?
    maxPrice
}

MarketSell {
    shares
    minPrice
}
```

or an equally explicit type-safe design.

Do not expose protocol wire amounts as primary product intent.

---

# 38. P3 — LIMIT ORDER DOMAIN

Limit order intent may remain:

```text
price
shares
side
```

but server-owned normalization must derive:

```text
makerAmount
takerAmount
```

using current Polymarket tick/amount rules.

---

# 39. P3 — PREVIEW IS SERVER AUTHORITY

Preview computes:

```text
market/token
side
order type
spend/shares
normalized price
fillable amount
average execution estimate
worst acceptable price
fees
max spend
max loss
max payout
tick size
Neg Risk
exchange
book identity
book observed time
preview expiry
eligibility version
wallet/funder context
```

Frontend must not independently reimplement financial semantics.

---

# 40. P3 — PREVIEW HASH

Define exactly what immutable semantic fields bind preview to authorization.

The hash must be:

```text
canonical
versioned
deterministic
```

Do not blindly hash JSON object serialization.

Test property:

```text
same semantic intent
→ same canonical hash

materially different intent
→ different hash
```

---

# 41. P3 — USER SIGNATURE

Hard invariant:

```text
what user sees
=
what user authorizes
=
what server posts
```

Where protocol produces derived signed amounts, the preview must disclose enough information for user intent equivalence.

Do not silently change:

```text
market
token
side
spend
shares
price bound
funder
wallet mode
fee policy
```

after confirmation.

---

# 42. P3 — DURABLE INTENT BEFORE EFFECT

Required execution order:

```text
validate request
      ↓
load preview
      ↓
verify signature / intent
      ↓
BEGIN DB TX
      ↓
insert/find OrderIntent
      ↓
insert OrderAttempt
      ↓
COMMIT
      ↓
ONLY NOW call venue
```

Never:

```text
CLOB POST
→ then save order
```

---

# 43. P3 — IDEMPOTENCY

Do not solve using only:

```text
mutex
sync.Map
frontend button disabling
process-local cache
```

Use durable PostgreSQL uniqueness/locking.

For:

```text
same user
same idempotency key
same semantic request
```

return canonical same intent/result.

For:

```text
same idempotency key
different semantic request
```

return conflict.

---

# 44. P3 — CONCURRENCY ACCEPTANCE

Instrument fake CLOB.

Run:

```text
2 concurrent
10 concurrent
100 concurrent
```

same-key requests.

Acceptance:

```text
logical intents = 1
venue submissions = 1
```

Run race detector.

---

# 45. P3 — CRASH MATRIX

Fault injection checkpoints:

```text
after intent before attempt
after attempt commit before HTTP
while HTTP in flight
venue accepted before response persisted
response persisted before projection
partial fill before position projection
cancel requested before venue response
```

After restart:

```text
no lost intent
no duplicate submit
state converges
```

---

# 46. P3 — UNKNOWN_RECONCILING

A timeout means:

```text
UNKNOWN
```

not:

```text
FAILED
```

and not:

```text
SAFE TO RETRY
```

Reconciler must use venue evidence before deciding next mutation.

---

# 47. P3 — OPEN ORDERS + FILLS

Persist venue order projection independently from user intent.

Persist every observed fill.

Fill identity must be idempotent.

A later source must not erase a known fill.

---

# 48. P3 — CANCEL/FILL RACE

Test both:

```text
cancel response → fill event
fill event → cancel response
```

Final result must preserve:

```text
executed quantity
remaining quantity
final venue state
```

---

# 49. P3 — NEG RISK

Do not infer from market title or category.

Use authoritative:

```text
neg_risk
```

market capability / CLOB context.

Test standard and Neg Risk exchange/signing paths separately.

---

# 50. P3 — WEB ORDER TICKET

The canonical web must render BFF truth.

UX states:

```text
not eligible
wallet not ready
loading preview
preview ready
preview stale
awaiting signature
submitting
accepted
live
delayed
partially filled
filled
cancel pending
cancelled
unknown / checking venue
rejected
```

Never show generic success before venue state proves it.

---

# 51. P3 — REAL WEB E2E

The audit found existing Playwright routes heavily mocked.

Plan two classes:

```text
COMPONENT / UI E2E
mocked deterministic contracts

SYSTEM E2E
real web
→ real BFF
→ ephemeral PostgreSQL
→ simulated CLOB
```

Do not require mainnet mutations.

---

# 52. P3 EXIT PROOF

Require:

```text
current CLOB V2 differential green
preview/sign/submit equivalence
market buy/sell semantics
durable intent
durable attempt
concurrency idempotency
restart recovery
ambiguous submission reconciliation
partial fills
cancel/fill race
stale-book block
Neg Risk
real system E2E
kill-switch drill
```

First real mainnet order remains a human gate.

---

# 53. PHASE 4 — BUILD THE REST OF CORE

Canonical P4 work:

```text
MKT-P4-001 Position projection service
MKT-P4-002 Activity feed

MKT-P4-003 MOVED → Smart Money
DO NOT IMPLEMENT AS P4

MKT-P4-004 CTF split/merge
MKT-P4-005 Resolution and redemption
MKT-P4-006 Withdrawal completion

MKT-P4-007 MOVED → Smart Money
DO NOT IMPLEMENT AS P4

MKT-P4-008 PnL analytics
MKT-P4-009 Portfolio reconciliation tests
MKT-P4-010 PHASE-4 exit gate
```

Do not confuse Intelligence with P4 Core.

---

# 54. P4 — POSITION PROJECTION

The audit found candidate code that can erase fill evidence when Data API lags.

Fix before wiring.

Core principle:

```text
absence of eventual projection evidence
!=
proof of absence
```

Example:

```text
CLOB fill exists

Data API temporarily says no position

Result:
POSITION PENDING / UPSTREAM LAG

NOT:
POSITION = 0
```

---

# 55. P4 — EVIDENCE MODEL

Explicitly model evidence:

```text
RetroPick OrderIntent
RetroPick OrderAttempt
VenueOrder
CLOB Fill
Data API Position
CTF Token Balance
Collateral Balance
Transaction Receipt
Chain Events
Resolution State
```

Every source must have:

```text
source
sourceTimestamp
observedAt
freshness
authority class
```

---

# 56. P4 — RECONCILIATION RESULT

Use explicit states such as:

```text
consistent
pending
upstream_lag
chain_lag
conflict
unknown
manual_review
```

Use existing canonical terminology when available.

Do not overwrite conflicting evidence to make UI simpler.

---

# 57. P4 — PORTFOLIO LEDGER

Define a backend-owned deterministic accounting engine.

Must support:

```text
buy
multiple buys
sell
partial sell
partial fill
fee
external position delta
open position
closed position
resolved winner
resolved loser
redeemed
```

No authoritative financial math in frontend.

---

# 58. P4 — FIXED POINT

Audit all authoritative accounting for:

```text
float32
float64
Number
parseFloat
```

Money/share authority must use fixed-point or exact decimal semantics.

Frontend conversions are display-only.

---

# 59. P4 — COST BASIS

Select and document one deterministic policy.

Do not invent a policy without checking venue semantics and existing system assumptions.

Test it with golden ledger vectors.

Version the calculation if future methodology can change.

---

# 60. P4 — REALIZED / UNREALIZED PNL

Output must distinguish:

```text
realized PnL
unrealized PnL
fees
market value
settled value
estimated value
```

Include provenance.

Do not claim estimated marks are settled funds.

---

# 61. P4 — ACTIVITY

Activity should project durable events:

```text
order submitted
order accepted
fill
cancel
deposit
CTF operation
redemption
withdrawal
```

Where appropriate.

Do not construct activity solely from transient frontend state.

---

# 62. P4 — CTF OPERATIONS

Use current official Polymarket CTF architecture.

Plan operations:

```text
split
merge
redeem
Neg Risk conversion if required/supported
```

Hard invariant:

```text
PREVIEW
→ USER AUTHORIZATION
→ DURABLE INTENT
→ DURABLE ATTEMPT
→ MUTATION
→ RECEIPT
→ RECONCILIATION
```

Reuse the durable-operation architecture proven in P3.

Do not create a second weak mutation system.

---

# 63. P4 — CTF PREVIEW

Preview must show:

```text
operation
market
condition
assets before
assets expected after
amount
contract
network
approval state
capability
estimated fees/gas where possible
expiry
```

---

# 64. P4 — REDEMPTION

Test:

```text
unresolved
resolved loser
resolved winner
already redeemed
duplicate request
RPC timeout
relay timeout
receipt delay
reorg
restart
```

Do not allow double execution.

---

# 65. P4 — WITHDRAWAL COMPLETION

Withdrawal must use a durable lifecycle.

Plan states equivalent to:

```text
previewed
awaiting_authorization
authorized
submitted
pending
broadcast
confirmed
reconciling
completed
failed
unknown
```

Do not freeze names until existing domain conventions are audited.

Properties:

```text
idempotent
restart-safe
reorg-safe
policy-gated
observable
```

---

# 66. P4 — WITHDRAWAL POLICY

Mainnet withdrawal remains subject to human/operational policy.

The execution agent may implement and locally/sandbox verify the state machine.

Do not bypass:

```text
withdrawal whitelist
production approval
```

to produce a green test.

---

# 67. P4 EXIT PROOF

Require:

```text
position evidence hierarchy tested
Data API lag tested
activity durable
fixed-point accounting
cost basis
realized/unrealized PnL
CTF split simulation
CTF merge simulation
redemption recovery
withdrawal recovery
restart tests
reorg tests
portfolio reconciliation SLA evidence
```

Only after this are P4 portfolio/CTF APIs stable enough for Phase 5 clients.

---

# 68. OPENAPI RECONCILIATION

The audit found generated TypeScript materially stale.

Build a matrix:

| Endpoint/type | OpenAPI | Backend | Generated TS | Web | Android |
|---|---|---|---|---|---|

Do not manually patch generated TypeScript.

Expected sequence:

```text
implementation semantics agreed
    ↓
OpenAPI updated
    ↓
OpenAPI validated
    ↓
client generated
    ↓
zero drift
    ↓
consumer compile
    ↓
contract tests
```

---

# 69. API SEMANTIC NAMING

Pay extra attention to ambiguous financial fields.

Avoid APIs where:

```text
amount
```

sometimes means USD and sometimes shares.

Use explicit semantics.

Similarly distinguish:

```text
signer
funder
account wallet
deposit wallet
venue order
RetroPick intent
```

---

# 70. MIGRATION STRATEGY

For every required new DB change:

```text
expand
migrate
verify
contract later
```

No destructive change without explicit authorization.

Likely required concerns:

```text
order intent uniqueness
order attempts
funding operations
position evidence
reconciliation findings
CTF operations
withdrawal operations
accounting snapshots
```

First audit what already exists.

Never create duplicate tables merely because phase docs mention conceptual names.

---

# 71. UNIFIED MUTATION JOURNAL

Evaluate whether P3/P4 should share an operation-journal pattern.

Candidate architecture:

```text
OperationIntent
OperationAttempt
ExternalReference
Receipt
ReconciliationState
```

with specialized domain payloads for:

```text
order
funding
CTF
redeem
withdraw
```

Do NOT over-generalize if it harms clarity.

But avoid building five unrelated non-durable mutation engines.

The plan must explicitly decide:

```text
shared primitive
vs
separate state machines
```

and explain why.

---

# 72. UNIFIED RECONCILIATION ENGINE

Evaluate common reconciliation infrastructure for:

```text
orders
funding
positions
CTF
withdrawal
```

Shared concerns:

```text
scheduled retry
bounded backoff
state transition
evidence recording
source freshness
conflict
manual review
metrics
```

Domain-specific evidence adapters may remain separate.

---

# 73. WEB INTEGRATION

Canonical web must use:

```text
generated RetroPick API
+
BFF
```

not direct Polymarket mutation APIs.

Read-only browser access must remain useful without wallet.

Plan integration for:

```text
Markets discovery
Market detail
realtime state
wallet readiness
funding
order ticket
orders
fills
positions
portfolio
redemption
withdrawal
```

Only phase-authorized capabilities appear enabled.

---

# 74. DO NOT MIX ANDROID PROGRAM

Phase 1 has Android scaffold planning.

Phase 5 owns Android completion.

Do NOT turn this P1–P4 recovery into Android redesign.

Only update shared contracts where required.

Ensure changes do not break future Android consumption.

---

# 75. DO NOT MIX SMART MONEY OWNERSHIP

P4 historical tasks:

```text
MKT-P4-003 Whale feed
MKT-P4-007 Wallet profiling
```

have moved to Smart Money.

Do not implement them under P4.

Portfolio may deep-link to Intelligence.

Keep:

```text
Markets Core
```

and:

```text
Smart Money Intelligence
```

architecturally separate.

---

# 76. TEST STRATEGY — MUST BE BUILT INTO THE PLAN

For every implementation task specify:

```text
failing test first
unit tests
property tests
database tests
contract tests
integration tests
system E2E
failure tests
race tests where relevant
observability evidence
```

---

# 77. REGRESSION TEST REQUIREMENT

Every audit finding requires a test that fails on the audited defective behavior.

Examples:

```text
same idempotency key reaches fake venue >1 times

SIWE missing domain succeeds

Data API absence deletes fill-derived position

web disables polling without subscriber

stale Gamma response receives fresh observedAt

generated client differs from OpenAPI

CI discovers zero Markets tests
```

After fix:

same test must turn green.

---

# 78. OFFICIAL PROTOCOL GOLDEN TESTS

Introduce maintainable current Polymarket compatibility tests.

They should cover protocol semantics, not implementation details.

Sources:

```text
official SDK
official CLI
official documentation examples
sanitized real read responses
```

Pin:

```text
source
version/SHA
capture date
```

---

# 79. REALTIME REPLAY

Create canonical deterministic replay fixtures:

```text
snapshot
delta
delta
disconnect
missed event
reconnect
snapshot
delta
```

Also:

```text
duplicate
gap
backward timestamp
tick-size change
epoch change
```

Same input:

```text
same final state
```

---

# 80. FAULT-INJECTION VENUE

Plan an instrumented fake CLOB capable of:

```text
accept
reject
delay
timeout before accept
accept then lose response
partial fill
late fill
cancel/fill race
429
500
connection reset
```

Expose counters so tests can assert exact network mutations.

---

# 81. FAULT-INJECTION CHAIN

For P2/P4 create simulation capable of:

```text
submitted
receipt delayed
confirmed
reorg
RPC unavailable
duplicate observation
```

No production chain mutation required.

---

# 82. CRITICAL JOURNEY TESTS

## J1 — Read

```text
Gamma fixture
→ ingest
→ Postgres
→ BFF
→ generated client
→ web
```

## J2 — Wallet readiness

```text
connect
→ SIWE
→ eligibility
→ wallet type
→ signer/funder
→ approvals/balance
→ ready
```

## J3 — Trade

```text
market
→ fresh book
→ preview
→ authorize
→ intent
→ attempt
→ fake CLOB
→ accepted
→ order
```

## J4 — Partial/cancel

```text
accepted
→ partial fill
→ cancel
→ late fill
→ reconcile
```

## J5 — Portfolio

```text
fill
→ pending position
→ Data lag
→ Data catches up
→ reconciled portfolio
```

## J6 — Resolution

```text
position
→ market resolved
→ redeem preview
→ simulated redeem
→ receipt
→ reconcile
```

## J7 — Withdrawal

```text
available balance
→ preview
→ authorize
→ durable operation
→ simulated chain/relayer
→ receipt
→ reconcile
```

## J8 — Restart

Kill process during every mutation lifecycle.

## J9 — Outage

Disable individual upstream dependencies.

Read path should degrade honestly.

---

# 83. SECURITY CAMPAIGN

Plan adversarial tests for:

```text
SIWE replay
domain confusion
URI confusion
chain confusion
wallet switch
session replay
funder injection
deposit-wallet injection
open redirect
signature tampering
preview tampering
CLOB credential exposure
Builder credential exposure
Relayer credential exposure
duplicate operation
replay operation
rate-limit abuse
relayer arbitrary-call attempt
```

---

# 84. OBSERVABILITY

Plan actual metrics, not documentation-only metrics.

At minimum:

```text
catalog age
Gamma failures
book age
WS state
WS resync count

SIWE failures
eligibility unknown/deny
wallet binding failures

funding operation state
funding reconciliation lag

order preview latency
order attempts
duplicate-idempotency conflicts
unknown submissions
order reconciliation lag

position conflict
position reconciliation lag

CTF pending
redemption pending
withdrawal pending
operation conflicts
```

No wallet address as uncontrolled high-cardinality metric label.

---

# 85. CI REPAIR

The audit found required Markets tests silently skipped.

Plan explicit CI jobs.

A required suite must fail if:

```text
0 tests discovered
```

unless the suite is explicitly optional.

Required categories:

```text
Go unit
Go race on fund-sensitive packages
Go build

migration
sqlc
OpenAPI validation
generated-client drift

web lint
web typecheck
web unit/component
web build

contract tests

real local-stack Markets Playwright

CLOB V2 differential

selected crash/reconciliation tests
```

---

# 86. PLAYWRIGHT CLASSIFICATION

Do not delete useful route-intercept UI tests.

Rename/classify them honestly as:

```text
frontend mocked journey tests
```

Add separate:

```text
system E2E
```

using:

```text
web
BFF
Postgres
fake Polymarket
```

---

# 87. TEST COUNT GUARD

CI should emit:

```text
expected suite
discovered test count
executed count
failed count
skipped count
```

Protect against stale workspace/package paths.

---

# 88. ARCHITECTURE SIMPLICITY

Preferred runtime:

```text
Go Markets BFF
PostgreSQL
bounded workers
OpenAPI
one realtime hub
one venue anti-corruption layer
existing web client
```

Do not add:

```text
Kafka
NATS
Spark
new database
microservice swarm
```

without measured need.

---

# 89. DO NOT REWRITE WORKING CODE FOR STYLE

For each module classify:

```text
CORRECT + KEEP
CORRECT + HARDEN
INCORRECT + REPAIR
INCOMPLETE + FINISH
DEAD + REMOVE LATER
```

Prefer minimal invariant-strengthening changes.

---

# 90. TASK-LEVEL COMPLETION MATRIX

The PLAN output must contain all current Phase tasks.

For each:

| Task | Audit status | Code status | Missing | Repair/build action | Tests | Exit dependency |
|---|---|---|---|---|---|---|

Cover:

```text
MKT-P1-001…010
MKT-P2-001…010
MKT-P3-001…010
MKT-P4-001…010
```

Mark:

```text
P3-006 ARCHIVED
P4-003 MOVED
P4-007 MOVED
```

correctly.

---

# 91. AUDIT-FINDING MATRIX

Separately include:

| Finding | Severity | Root cause | Phase task | Repair | Regression test |
|---|---|---|---|---|---|

Every audit finding must map somewhere.

No orphan blocker.

---

# 92. DEVELOPMENT PROGRAM

Design implementation waves.

Recommended starting shape:

```text
REC-0
Lineage / baseline / Graphify / safety flags

REC-1
Phase 1 truth repair

REC-2
Phase 2 auth + wallet identity repair

REC-3
CLOB V2 protocol correction

REC-4
Durable order/idempotency foundation

REC-5
Order reconciliation/cancel/fill recovery

REC-6
Complete Phase 2 funding

REC-7
Position/evidence reconciliation

REC-8
Portfolio accounting

REC-9
CTF + redemption

REC-10
Withdrawal completion

REC-11
OpenAPI + generated clients

REC-12
Web integration

REC-13
CI + system E2E + chaos

REC-14
P1–P4 exit-gate verification

REC-15
Independent re-audit
```

Refine after dependency analysis.

---

# 93. EACH REC WAVE MUST INCLUDE

For every wave provide:

```text
Goal
Audit findings addressed
Canonical phase tasks addressed
Prerequisites
Exact likely files
Schema/migrations
API changes
Tests written first
Implementation steps
Security review
Code review
Verification commands
Failure injection
Evidence artifact
Exit criteria
Rollback
Next dependency
```

---

# 94. MICRO-PHASE RULE

Do not combine all execution changes in one gigantic PR.

Preferred flow:

```text
microphase
→ tests
→ implementation
→ review
→ verification
→ evidence
→ next microphase
```

Possible implementation sequencing:

```text
REC-3A official fixture vectors
REC-3B order domain
REC-3C typed-data mapping
REC-3D preview binding
```

instead of one "fix CLOB" mega-change.

---

# 95. OWNERSHIP / WRITE-SET PLAN

For each wave specify:

```text
owned paths
shared paths
generated paths
migration ownership
OpenAPI ownership
frontend ownership
```

Avoid agents modifying the same file simultaneously.

---

# 96. EXACT FILE IMPACT

Plan output must identify likely source areas based on actual repository inspection.

Expect inspection of:

```text
apps/backend/internal/markets/auth/**
apps/backend/internal/markets/eligibility/**
apps/backend/internal/markets/wallet/**
apps/backend/internal/markets/balances/**
apps/backend/internal/markets/funding/**
apps/backend/internal/markets/clob/**
apps/backend/internal/markets/orders/**
apps/backend/internal/markets/reconcile/**
apps/backend/internal/markets/realtime/**
apps/backend/internal/markets/positions/**
apps/backend/internal/markets/portfolio/**
apps/backend/internal/markets/ctf/**

apps/fe-v1/**
or executable canonical web path

packages/polymarket/**

schemas/openapi/**
schemas/asyncapi/**

migrations/**
scripts/**
.github/workflows/**
```

Do not assume docs' stale `apps/web` paths are executable truth.

---

# 97. REQUIRED C4 — CURRENT SYSTEM

Create C4 L1/L2/L3 based ONLY on components actually present.

Show broken/incomplete links explicitly.

Do not draw desired architecture as current architecture.

---

# 98. REQUIRED C4 — TARGET P1–P4

Target:

```text
User
 │
 ▼
Web
 │
 ▼
Go Markets BFF
 │
 ├── Catalog
 ├── Market Data
 ├── Auth / Eligibility
 ├── Wallet Readiness
 ├── Funding
 ├── Order Orchestrator
 ├── Reconciliation
 ├── Portfolio
 └── CTF / Asset Exit
 │
 ▼
PostgreSQL

Adapters:
Gamma
CLOB REST
CLOB WS
Data API
Relayer
Polygon / CTF
```

Explicit:

```text
User private key → NEVER backend

Builder/Relayer secrets → NEVER browser
```

---

# 99. REQUIRED STATE MACHINE — ORDER

Produce exact proposed state machine.

Must cover:

```text
preview
authorization
durable intent
attempt
venue acceptance
delayed
live
partial
fill
cancel
unknown
reconcile
settle
```

Specify legal and illegal transitions.

---

# 100. REQUIRED STATE MACHINE — FUNDING

Produce durable FSM with:

```text
duplicate handling
restart
RPC lag
reorg
```

---

# 101. REQUIRED STATE MACHINE — CTF

Cover:

```text
preview
authorization
submission
receipt
confirmation
reconciliation
failure
unknown
reorg
```

---

# 102. REQUIRED STATE MACHINE — WITHDRAWAL

Same durability properties.

---

# 103. REQUIRED RECONCILIATION POLICY

Provide evidence-precedence matrix:

| Domain | Source | Authority | Can negate previous evidence? | Freshness |
|---|---|---|---|---|

For:

```text
orders
fills
positions
balances
CTF
withdrawal
```

---

# 104. REQUIRED FINANCIAL INVARIANTS

At minimum:

```text
one logical order intent cannot create two venue orders

external mutation never precedes durable local intent

missing Data API state does not erase confirmed fill

accounting cannot create assets

redeem cannot execute twice

withdrawal cannot debit twice

client cannot choose arbitrary funder

unknown eligibility cannot become allowed

stale book cannot authorize marketable order

preview cannot authorize different signed intent
```

---

# 105. PROPERTY / MODEL-BASED TESTS

Identify parts suitable for state-machine/model tests:

```text
order state
funding state
CTF state
withdrawal state
position reconciliation
```

Generate transition sequences.

Assert:

```text
invariants always hold
```

---

# 106. LOAD / CONCURRENCY

Do not performance-optimize blindly.

But stress correctness under:

```text
100 duplicate submit callers

parallel order reads + reconcile

multiple fill observations

parallel reconciliation workers

parallel funding observations
```

Use database locking/constraints appropriately.

---

# 107. POSTGRESQL AS SAFETY MECHANISM

Prefer DB guarantees where appropriate:

```text
UNIQUE
CHECK
FOREIGN KEY
transaction
SELECT FOR UPDATE
advisory lock only where justified
```

Do not depend solely on process memory for financial uniqueness.

---

# 108. ERROR TAXONOMY

Create canonical typed errors for:

```text
invalid_request
not_eligible
wallet_not_ready
preview_expired
stale_market_data
idempotency_conflict
venue_rejected
venue_unknown
reconciling
upstream_unavailable
chain_pending
policy_denied
```

Avoid frontend string matching.

---

# 109. USER-FACING TRUTH

Every uncertain financial state must be communicated honestly.

Examples:

```text
Checking status
Position updating
Waiting for confirmation
Data delayed
Withdrawal pending
```

not:

```text
Failed
```

when actual state is unknown.

And not:

```text
Completed
```

until sufficient evidence exists.

---

# 110. ROLLBACK STRATEGY

For each new mutation feature:

```text
feature flag
kill switch
disable new operations
continue reconciliation
continue reads
```

Never kill reconciliation together with writes.

---

# 111. HUMAN GATES

Separate:

```text
TECHNICALLY VERIFIED
```

from:

```text
AUTHORIZED FOR MAINNET
```

Human gates include:

```text
first mainnet order
production CLOB credentials
production Builder configuration
production Relayer credentials
CTF mainnet relay
withdrawal whitelist
production secret changes
production deployment
```

Do not fake these gates.

---

# 112. FINAL VERIFICATION

After implementation, the execution program must run:

```text
full Go unit
race
build

database migrations
sqlc

OpenAPI
generated-client drift

frontend lint
typecheck
unit
build

contract

system E2E

CLOB differential

realtime replay

fault injection

restart suite

reconciliation suite
```

Use actual repository commands discovered during planning.

---

# 113. INDEPENDENT RE-AUDIT

After all planned implementation work:

run a new audit from scratch.

Do not simply execute new tests and declare success.

Revisit all 15 original critical QA questions.

Re-run every original adversarial defect.

Try to invalidate the new architecture.

---

# 114. FINAL PHASE VERDICT MODEL

For every phase independently:

```text
SPECIFIED
IMPLEMENTED
WIRED
TESTED
INTEGRATED
FAILURE-SAFE
OBSERVABLE
EXIT-GATE PROVEN
```

Only then:

```text
VERIFIED
```

---

# 115. TARGET FINAL RESULT

Desired, but NOT predetermined:

```text
Phase 1  VERIFIED
Phase 2  VERIFIED
Phase 3  VERIFIED
Phase 4  VERIFIED

Integrated P1–P4
GO
```

If evidence does not support it:

report:

```text
CONDITIONAL GO
```

or:

```text
NO-GO
```

Do not optimize for a green label.

---

# 116. PLAN MODE REQUIRED OUTPUT

Return the plan with exactly these major sections.

## A. Executive Recovery Verdict

Explain what must be repaired vs built new.

## B. Repository Lineage

Identify safe remediation base/worktree/branch.

## C. Audit Finding Matrix

Every finding and remediation.

## D. Phase Completion Matrix

All P1–P4 tasks.

## E. Reference Study Matrix

Which reference informs which repair.

## F. Official Polymarket Compatibility Matrix

Current behavior that RetroPick must match.

## G. ECC / Skills Activation Matrix

Exact methodology routing.

## H. Graphify Findings

Dependency graph + coupling + critical path.

## I. Current C4

What really exists.

## J. Target C4

What completed P1–P4 should become.

## K. Financial Evidence Architecture

Orders → fills → positions → chain.

## L. Auth / Wallet Architecture

Signer/funder/deposit-wallet/etc.

## M. Realtime Architecture

Snapshot/reconnect/poll fallback.

## N. Order State Machine

Exact states and transitions.

## O. Funding State Machine

Exact states and transitions.

## P. CTF State Machine

Exact states and transitions.

## Q. Withdrawal State Machine

Exact states and transitions.

## R. Reconciliation Policy

Source authority matrix.

## S. Database Plan

Tables/constraints/transactions/migrations.

## T. OpenAPI Plan

Exact semantic contract changes.

## U. Backend Per-Package Plan

Exact modules.

## V. Web Integration Plan

Routes/components/API state.

## W. Test Architecture

Unit/property/integration/E2E/chaos.

## X. CI Repair Plan

Required jobs and zero-test protection.

## Y. Observability Plan

Metrics/logs/traces.

## Z. Security Plan

Auth/wallet/signature/relayer/secrets.

## AA. Recovery Waves

REC-0…REC-N.

## AB. Microphase Breakdown

Detailed execution tickets.

## AC. Per-File Change Plan

Classify:

```text
KEEP
MODIFY
CREATE
GENERATE
DELETE
DEFER
```

## AD. Human Gates

Clearly separated.

## AE. Definition of Done per Phase

P1/P2/P3/P4.

## AF. Integrated Definition of Done

Complete P1–P4 system.

## AG. Re-Audit Procedure

How the independent QA pass will run.

## AH. Recommended First Implementation Microphase

Give exact:

```text
files
tests
migration if any
skills
verification
```

for the first execution slice.

---

# 117. FIRST IMPLEMENTATION SLICE RULE

The first implementation slice should NOT be:

```text
build P4 withdrawal
```

before fixing S0/S1 execution defects.

Expected early priority is likely:

```text
safety flags
+
official CLOB V2 differential fixtures
+
order-domain semantic correction
```

or another dependency-equivalent slice proven by the graph.

---

# 118. STOP CONDITION

You are in PLAN MODE.

Do NOT implement.

Do NOT commit.

Do NOT push.

Do NOT deploy.

Return the complete implementation-grade recovery/completion plan.

The plan must be detailed enough that an execution agent can subsequently run:

```text
REC-0
→ tests
→ implementation
→ verification
→ REC-1
→ ...
→ complete P1
→ complete P2
→ complete P3
→ complete P4
→ integrated QA
→ independent audit
```

without inventing architecture during execution.

Then STOP for human authorization to begin implementation.

---

# FINAL PRINCIPLE

The objective is not:

```text
make the audit report disappear
```

The objective is:

```text
make the audit defects impossible
by construction,
tests,
database constraints,
protocol compatibility,
reconciliation,
and failure-safe architecture.
```

RetroPick Markets Phase 1–4 is complete only when this entire chain is proven:

```text
DISCOVER
   ↓
FRESH MARKET DATA
   ↓
WALLET + ELIGIBILITY
   ↓
FUNDING
   ↓
PREVIEW
   ↓
USER AUTHORIZATION
   ↓
DURABLE INTENT
   ↓
VENUE SUBMISSION
   ↓
FILL / CANCEL
   ↓
RECONCILIATION
   ↓
POSITION
   ↓
PORTFOLIO
   ↓
RESOLUTION
   ↓
REDEEM
   ↓
WITHDRAW
```

with:

```text
NO key custody
NO fail-open eligibility
NO stale-as-live data
NO preview/sign mismatch
NO duplicate venue mutation
NO lost intent after crash
NO fill evidence erasure
NO double credit
NO double redemption
NO double withdrawal
NO silent CI skipping
```

That is the standard for declaring RetroPick Markets Core Phase 1–4 verified.