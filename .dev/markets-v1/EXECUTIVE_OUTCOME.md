# Executive outcome — Markets V1 documentation baseline

**Date:** 2026-07-25 (reconciled 2026-08-11)
**Status:** documentation complete — spec freeze ready; P1–P4 implemented but gated (mutation paths off)
**Wave:** 9 (agent harness) complete

## Description

This is the executive outcome snapshot for Markets V1 documentation baseline (Wave 9 complete as of 2026-07-25; Smart Money Launch docs + dual-track phase reposition as of 2026-08-09): the reviewed corpus and agent harness are ready for spec freeze, and **product code is not "live"** — P1–P4 implementations exist under the 2026-08-09..11 recovery program, but mutation paths are gated off and `current_phase` is **PHASE-2** (frozen by design per REC-0/REC-14; see [implementation-manifest.yaml](../../.harness/products/markets-v1/planning/implementation-manifest.yaml)).

It separates documentation completeness from shipping reality, summarizes recommended architecture (Go BFF ACL, shared OpenAPI, Compose Android later), custody/signing posture, Polymarket constraints, **Smart Money Launch** (ten features under `intelligence/`, archived Wave-6 bulk), dual-track phases (Core + Smart Money; Spec→Build→Harden→Production), and critical blockers (BLK-*). Use at kickoff, phase-gate reviews, and whenever someone claims “Markets is live.”

Phase ownership authority: [phases/PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md](phases/PHASE_REASSESSMENT_AND_PRODUCTION_ROADMAP.md). Intelligence product scope: [intelligence/INTELLIGENCE_LAUNCH_V1.md](intelligence/INTELLIGENCE_LAUNCH_V1.md).

Live progress belongs in harness `implementation-manifest.yaml` / `task-graph.yaml` and code under `apps/` — not this narrative alone. Do not clear BLK rows without evidence; do not treat Wave language as staging-live or production trading.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before Honest status and architecture summaries below.

The 5W+1H table below is a **navigation aid** only. It does not replace blocker tables or phase plan rows; if anything conflicts, those tables win. Documentation completeness ≠ product implementation.

| Lens | Answer |
|------|--------|
| **Who** | Executives and orchestrators needing an honest baseline; agents about to start Markets work who must not assume trading/Android are already live; humans deciding formal scope sign-off after Wave 9 harness completion. |
| **What** | Executive outcome snapshot (2026-07-25, reconciled 2026-08-11): 121 reviewed docs + agent harness complete; **P1–P4 implemented under the 2026-08-09..11 recovery program but gated** (`current_phase` PHASE-2 frozen; mutation paths off); recommended architecture (Go BFF ACL, shared OpenAPI, Compose Android later); custody/signing posture; Polymarket constraints; intelligence tiers; critical blockers (BLK-*). |
| **When** | At program kickoff, phase-gate reviews, and whenever someone claims “Markets is live.” Re-read after evidence revalidation or when blocker IDs change in [BLOCKERS_AND_HUMAN_APPROVALS.md](../../.harness/products/markets-v1/governance/BLOCKERS_AND_HUMAN_APPROVALS.md). |
| **Where** | This file + [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) + harness manifest/`task-graph.yaml`. Code truth: `apps/backend/internal/markets/` (P1–P4 modules; positions glue not yet mounted), `apps/web` (catalog + trading/funding UI), `apps/android/` (README-only), OpenAPI v1.4.0 (capability-gated) — not this narrative alone. |
| **Why** | Wave completion language is easy to misread as shipped product. This outcome doc separates spec freeze readiness from implementation reality and lists BLK-001–021 so agents escalate instead of inventing geoblock, CLOB, or Gradle projects ad hoc. |
| **How** | Treat PHASE-0 docs as complete; read each task's `gate` note in `task-graph.yaml`; revalidate CLOB V2 / contract addresses before trading phases; keep ADR-001 (no custom exchange) and non-custody rules. Do not clear BLK rows without evidence; do not advance `current_phase` without orchestrator authorization + staging proof. |

### Worked example

**Happy path — kickoff**

1. Read Honest status: specs/harness complete; P1–P4 implemented but gated; `current_phase` PHASE-2 frozen.
2. Confirm manifest `current_phase` = PHASE-2 and read the task-graph `gate` notes before selecting a task.
3. Open task-graph; pick a non-mutation task (catalog/OpenAPI/read surfaces) or a gated P3/P4 follow-up; do not treat gated tasks as live trading.

**Happy path — blocker hygiene**

1. Android trading request → BLK-002 (no Gradle project) + PHASE-5 sequencing.
2. Log/escalate; do not stub a WebView “Android” as completion.

**Failure / Never**

- Claiming staging-live or production trading from documentation alone.
- Clearing BLK-010/011 without registry pull + smoke proof.
- Shipping auto copy trading despite Never-V1 intelligence row.

**Agent checklist**

- [ ] Honest status table acknowledged?
- [ ] Manifest `current_phase` + task `gate` notes read?
- [ ] Relevant BLK-* read?
- [ ] Architecture bullets match ADRs?
- [ ] Evidence still partially_verified where noted?

**Reading tip:** Start at Honest status + Critical blockers; treat Recommended architecture as the fence, not an invitation to implement all layers at once.

## Honest status

| Dimension | State |
|-----------|-------|
| Specification corpus | **Complete** — 121 documents reviewed per [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md) |
| Agent harness | **Complete** — task graph, manifest, traceability, §23 invariant check |
| Product code | **Implemented (P1–P4) but gated** — recovery program 2026-08-09..11; mutation paths off; `current_phase` PHASE-2 frozen |
| Upstream evidence | **Partially verified** — revalidate Polymarket CLOB V2 before trading phases |
| Human scope sign-off | **Recommended** — PHASE-0 exit gate satisfied by documentation; formal approval still advised |

## Recommended architecture

- **Markets BFF:** Go `apps/backend/internal/markets/` as anti-corruption layer; clients use `schemas/openapi/markets-v1.yaml`.
- **Web:** `apps/web` with `NEXT_PUBLIC_PRODUCT=markets` for Markets-only deploy.
- **Android:** Native Kotlin + Jetpack Compose; consumes same OpenAPI as web (PHASE-5 scaffold).
- **No custom exchange contract** for Markets V1 (ADR-001).

## Repository reusability

| Area | Reusable | Notes |
|------|----------|-------|
| Monorepo layout (R0–R3) | Yes | `apps/web`, `apps/backend`, `packages/polymarket` |
| Android app | No | README only; greenfield in PHASE-5 |
| Markets BFF | Extensive | Gamma catalog + P1–P4 modules (orders/clob/reconcile/positions/intelligence); positions glue not yet mounted |

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
| PHASE-1 | Foundation and Read Markets | complete | **delivered** (P1-010 exit) |
| PHASE-2 | Account Wallet and Funding | reviewed | **current_phase — delivered; exit CONDITIONAL (BLK-001 staging proof)** |
| PHASE-3 | Web Trading Core | reviewed | implemented-but-gated (W1-004; phase not advanced) |
| PHASE-4 | Portfolio, Redemption, Withdrawal | reviewed | implemented-but-gated (W1-004; glue pending) |
| PHASE-5 | Android Compose Markets | reviewed | planned |
| PHASE-6 | Hardening, CI/CD, SRE | reviewed | planned |
| PHASE-7 | Production Launch | reviewed | planned |
| PHASE-8 | Post-V1 Advanced | reviewed | planned |

## Critical blockers

### Implementation blockers

| ID | Blocker | Phase |
|----|---------|-------|
| BLK-001 | GeoIP + geoblock adapters shipped; ops staging proof pending | PHASE-2 |
| BLK-002 | Android beyond README scaffold | PHASE-5 |
| BLK-004 | CLOB V2 submit implemented; gated — live venue credentials + staging proof pending | PHASE-3 |
| BLK-005 | Wallet connect + funding flows implemented (partial); funding lifecycle + relayer sandbox pending (REC-6) | PHASE-2 |
| BLK-006 | OpenAPI covers full V1 surface (v1.4.0) — capability-gated at runtime | PHASE-1 |

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

See [../../.harness/products/markets-v1/governance/BLOCKERS_AND_HUMAN_APPROVALS.md](../../.harness/products/markets-v1/governance/BLOCKERS_AND_HUMAN_APPROVALS.md).

## First executable phase

**`current_phase` is PHASE-2 — Account Wallet and Funding** (frozen by the recovery program; do not advance without orchestrator authorization + BLK-001/BLK-004 staging proof).

Rationale: PHASE-1 (read) is complete and delivered; PHASE-2 foundations are implemented and verified (exit CONDITIONAL on BLK-001 ops staging proof); PHASE-3/PHASE-4 tasks are implemented-but-gated — see `gate` notes in `task-graph.yaml`. No signing or fund movement beyond sandbox/fixtures until the human gates clear.

**Next executable work:**

1. PHASE-4 glue — wire positions/portfolio/activity routes into `cmd/markets-api` (deferred from MKT-P4-001, owned separately)
2. `MKT-P4-002` — web portfolio view consuming `GET /markets/me/positions` (OpenAPI v1.4.0 frozen)
3. Phase-advance evidence — BLK-001 ops staging proof + BLK-004 live-credential rehearsal, then orchestrator authorization to move `current_phase`

## Verification summary

| Check | Result |
|-------|--------|
| Files in document map | 121/121 present, all `reviewed` |
| Harness manifest | PHASE-0–8 populated, `current_phase: PHASE-2` (frozen per recovery program) |
| Task graph | 61 tasks; P3/P4 implemented-but-gated marked `done` with `gate:` notes + evidence links (W1-004 reconciliation) |
| Cross-document invariants (§23) | 28/28 checked — [INVARIANT_CHECK.md](../../.harness/products/markets-v1/governance/INVARIANT_CHECK.md) |
| Product code implemented | **Yes, gated** — P1–P4 recovery program (2026-08-09..11); mutation flags off |
