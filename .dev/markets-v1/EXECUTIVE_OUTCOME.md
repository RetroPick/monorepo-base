# Executive outcome — Markets V1 documentation baseline

**Date:** 2026-07-25
**Status:** documentation complete — spec freeze ready (no product implementation yet)
**Wave:** 9 (agent harness) complete

## Description

This is the executive outcome snapshot for Markets V1 documentation baseline (Wave 9 complete as of 2026-07-25; Smart Money Launch docs + dual-track phase reposition as of 2026-08-09): the reviewed corpus and agent harness are ready for spec freeze, but **product code is not “live”** — PHASE-1 remains the first implementation phase (`current_phase: PHASE-1`).

It separates documentation completeness from shipping reality, summarizes recommended architecture (Go BFF ACL, shared OpenAPI, Compose Android later), custody/signing posture, Polymarket constraints, **Smart Money Launch** (ten features under `intelligence/`, archived Wave-6 bulk), dual-track phases (Core + Smart Money; Spec→Build→Harden→Production), and critical blockers (BLK-*). Use at kickoff, phase-gate reviews, and whenever someone claims “Markets is live.”

Phase ownership authority: [phases/PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](phases/PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md). Intelligence product scope: [intelligence/INTELLIGENCE_LAUNCH_V1.md](intelligence/INTELLIGENCE_LAUNCH_V1.md).

Live progress belongs in harness `implementation-manifest.yaml` / `task-graph.yaml` and code stubs under `apps/` — not this narrative alone. Do not clear BLK rows without evidence; do not treat Wave language as staging-live or production trading.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before Honest status and architecture summaries below.

The 5W+1H table below is a **navigation aid** only. It does not replace blocker tables or phase plan rows; if anything conflicts, those tables win. Documentation completeness ≠ product implementation.

| Lens | Answer |
|------|--------|
| **Who** | Executives and orchestrators needing an honest baseline; agents about to start PHASE-1 who must not assume trading/Android already exist; humans deciding formal scope sign-off after Wave 9 harness completion. |
| **What** | Executive outcome snapshot (2026-07-25): 121 reviewed docs + agent harness complete; **product code not started** as executable Markets work (PHASE-1 first); recommended architecture (Go BFF ACL, shared OpenAPI, Compose Android later); custody/signing posture; Polymarket constraints; intelligence tiers; critical blockers (BLK-*). |
| **When** | At program kickoff, phase-gate reviews, and whenever someone claims “Markets is live.” Re-read after evidence revalidation or when blocker IDs change in [BLOCKERS_AND_HUMAN_APPROVALS.md](agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md). |
| **Where** | This file + [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) + harness manifest/`task-graph.yaml`. Code truth for stubs: `apps/backend/internal/markets/` (partial), `apps/android/` (README-only), OpenAPI stub surface — not this narrative alone. |
| **Why** | Wave completion language is easy to misread as shipped product. This outcome doc separates spec freeze readiness from implementation reality and lists BLK-001–021 so agents escalate instead of inventing geoblock, CLOB, or Gradle projects ad hoc. |
| **How** | Treat PHASE-0 docs as complete; start only PHASE-1 ready tasks; revalidate CLOB V2 / contract addresses before trading phases; keep ADR-001 (no custom exchange) and non-custody rules. Do not clear BLK rows without evidence. |

### Worked example

**Happy path — kickoff**

1. Read Honest status: specs/harness complete; code not started.
2. Confirm first executable phase = PHASE-1 Foundation and Read Markets.
3. Open task-graph; pick a catalog/OpenAPI task; ignore PHASE-3 trading until deps and BLK-004/006 addressable.

**Happy path — blocker hygiene**

1. Android trading request → BLK-002 (no Gradle project) + PHASE-5 sequencing.
2. Log/escalate; do not stub a WebView “Android” as completion.

**Failure / Never**

- Claiming staging-live or production trading from documentation alone.
- Clearing BLK-010/011 without registry pull + smoke proof.
- Extending legacy epoch to bypass greenfield Markets work.
- Shipping auto copy trading despite Never-V1 intelligence row.

**Agent checklist**

- [ ] Honest status table acknowledged?
- [ ] Phase plan: PHASE-1 first executable?
- [ ] Relevant BLK-* read?
- [ ] Architecture bullets match ADRs?
- [ ] Evidence still partially_verified where noted?

**Reading tip:** Start at Honest status + Critical blockers; treat Recommended architecture as the fence, not an invitation to implement all layers at once.

## Honest status

| Dimension | State |
|-----------|-------|
| Specification corpus | **Complete** — 121 documents reviewed per [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) |
| Agent harness | **Complete** — task graph, manifest, traceability, §23 invariant check |
| Product code | **Not started** — PHASE-1 is first executable implementation phase |
| Upstream evidence | **Partially verified** — revalidate Polymarket CLOB V2 before trading phases |
| Human scope sign-off | **Recommended** — PHASE-0 exit gate satisfied by documentation; formal approval still advised |

## Recommended architecture

- **Three products, one monorepo:** Markets (Polymarket), PRISM (future), Legacy epoch v1 (frozen).
- **Markets BFF:** Go `apps/backend/internal/markets/` as anti-corruption layer; clients use `schemas/openapi/markets-v1.yaml`.
- **Web:** `apps/web` with `NEXT_PUBLIC_PRODUCT=markets` for Markets-only deploy.
- **Android:** Native Kotlin + Jetpack Compose; consumes same OpenAPI as web (PHASE-5 scaffold).
- **No custom exchange contract** for Markets V1 (ADR-001).

## Repository reusability

| Area | Reusable | Notes |
|------|----------|-------|
| Monorepo layout (R0–R3) | Yes | `apps/web`, `apps/backend`, `packages/polymarket` |
| Legacy epoch stack | Reference only | Quarantined; not extended for Markets |
| Android app | No | README only; greenfield in PHASE-5 |
| Markets BFF stub | Partial | Gamma catalog + eligibility stub exists |

## Stack decisions

| Layer | Decision |
|-------|----------|
| Web | Next.js in `apps/web`, product routes under `src/products/markets/` |
| Backend | Go modular; `internal/markets/` greenfield |
| Android | Kotlin, Jetpack Compose, Material 3, Hilt, Retrofit |
| Venue | Polymarket official APIs/SDKs |
| Chain | Polygon (verify per evidence register) |

## Custody and signing

- RetroPick does **not** hold raw user private keys.
- Backend never silently signs user orders.
- Preview-before-sign for all asset mutations (ADR-003).

## Polymarket constraints (current)

- CLOB V2 migration baseline; verify addresses in evidence register before production.
- Geographic restrictions enforced server-side (fail closed).
- Builder Program for attribution/relayer where authorized.
- No reliable public testnet — fixtures and capped smoke wallets required.

## Intelligence feature sets

| Tier | Scope |
|------|-------|
| V1 locked | Watchlist alerts, basic market health, deterministic signals with evidence |
| V1.1 gated | Wallet profiling, expanded heuristics |
| Post-V1 | Relationship scanner, advanced arbitrage hints (descriptive only) |
| Never V1 | Auto copy trading, AI-triggered orders |

## Open-source adoption

- Official Polymarket SDKs: adopt with license verification (ADR-007).
- Missing/ambiguous licenses: clean-room behavioral reimplementation.
- No pixel-for-pixel UI copy of Polymarket.

## Documents created

121 files under `.dev/markets-v1/` — see [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md). All marked `reviewed` as of 2026-07-25.

## Phase plan summary

| Phase | Name | Doc status | Implementation |
|-------|------|------------|----------------|
| PHASE-0 | Discovery and Spec Freeze | **complete** | documentation only |
| PHASE-1 | Foundation and Read Markets | reviewed | **first executable** |
| PHASE-2 | Account Wallet and Funding | reviewed | planned |
| PHASE-3 | Web Trading Core | reviewed | planned |
| PHASE-4 | Portfolio, Redemption, Withdrawal | reviewed | planned |
| PHASE-5 | Android Compose Markets | reviewed | planned |
| PHASE-6 | Hardening, CI/CD, SRE | reviewed | planned |
| PHASE-7 | Production Launch | reviewed | planned |
| PHASE-8 | Post-V1 Advanced | reviewed | planned |

## Critical blockers

### Implementation blockers

| ID | Blocker | Phase |
|----|---------|-------|
| BLK-001 | Geoblock eligibility upstream not wired | PHASE-2 |
| BLK-002 | Android Gradle project does not exist | PHASE-5 |
| BLK-004 | CLOB integration not implemented | PHASE-3 |
| BLK-005 | Wallet connect and funding flows not implemented | PHASE-2 |
| BLK-006 | OpenAPI covers stub endpoints only | PHASE-1 |

### External/upstream blockers

| ID | Blocker | Notes |
|----|---------|-------|
| BLK-010 | Contract addresses require revalidation | evidence register before production |
| BLK-011 | CLOB V2 details may change | monitor upstream changelog |
| BLK-003 | Builder Program approval | production attribution |

### Legal/policy blockers

| ID | Blocker | Notes |
|----|---------|-------|
| BLK-020 | Per-region legal review | before production trading |
| BLK-021 | Google Play financial-features declaration | Android production |

### Human-approval blockers

| ID | Gate | Phase |
|----|------|-------|
| BLK-030 | Production wallet creation | PHASE-2+ |
| BLK-031 | Real on-chain transaction | PHASE-3+ |
| BLK-032 | Google Play production release | PHASE-7 |
| BLK-033 | New jurisdiction enablement | any |

See [agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md](agent-harness/BLOCKERS_AND_HUMAN_APPROVALS.md).

## First executable phase

**PHASE-1 — Foundation and Read Markets** is ready to begin.

Rationale: specification and harness are complete; PHASE-0 deliverables exist and are reviewed; no signing or fund movement in PHASE-1.

**First three agent tasks (require human acknowledgment before merge):**

1. `MKT-P1-001` — OpenAPI markets-v1 expansion for catalog read models
2. `MKT-P1-002` — Gamma catalog client hardening in `internal/markets/gamma`
3. `MKT-P1-003` — Markets database schema v1 (catalog cache, watchlist foundation)

## Verification summary

| Check | Result |
|-------|--------|
| Files in document map | 121/121 present, all `reviewed` |
| Harness manifest | PHASE-0–8 populated, `current_phase: PHASE-1` |
| Task graph | Wave 9 doc-verification + PHASE-0–8 implementation tasks |
| Cross-document invariants (§23) | 28/28 checked — [INVARIANT_CHECK.md](agent-harness/INVARIANT_CHECK.md) |
| Product code implemented | **No** — documentation and harness only |
