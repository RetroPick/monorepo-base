# Decision and Assumption Log

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

## 1. Purpose

Chronological log of decisions and expiring assumptions. Agents MUST record non-obvious choices here before marking tasks done.

## 2. How to use

| Event | Action |
|-------|--------|
| Architecture choice | Add row to **Decisions** with ADR link |
| Time-sensitive upstream claim | Add row to **Assumptions** with expiry |
| Blocker workaround rejected | Note in **Decisions** with rationale |
| Scope change | Requires ADR + human approval first |

## 3. Decisions

| Date | ID | Decision | ADR / Doc | Task |
|------|-----|----------|-----------|------|
| 2026-07-24 | D-001 | No custom exchange | ADR-001 | MKT-P0-004 |
| 2026-07-24 | D-002 | BFF at internal/markets | ADR-002 | MKT-P0-004 |
| 2026-07-24 | D-003 | Shared OpenAPI for web/Android | ADR-004 | MKT-P0-004 |
| 2026-07-24 | D-004 | No auto copy trading in V1 | ADR-009 | MKT-P0-004 |
| 2026-07-24 | D-005 | Jetpack Compose only for Android | ADR-006 | MKT-P0-004 |
| 2026-07-25 | D-006 | Documentation spec-freeze ready | EXECUTIVE_OUTCOME.md | MKT-P0-008 |
| 2026-07-25 | D-007 | Wave 9 harness complete; PHASE-1 first executable | implementation-manifest.yaml | MKT-W9-005 |
| 2026-07-25 | D-008 | 28 §23 invariants verified across 121 docs | INVARIANT_CHECK.md | MKT-W9-002 |

## 4. Assumptions (expiring)

| ID | Assumption | Expires | Revalidation | Task |
|----|------------|---------|--------------|------|
| A-001 | pUSD collateral config current | before PHASE-3 | Polymarket docs + evidence register | MKT-P0-002 |
| A-002 | Gamma API shape stable | PHASE-1 exit | integration tests | MKT-P1-002 |
| A-003 | CLOB V2 endpoint registry accurate | before PHASE-3 | upstream changelog | MKT-P0-002 |
| A-004 | No public Polymarket testnet | ongoing | fixture strategy in MASTER_TEST_PLAN | MKT-P0-002 |
| A-005 | Builder Program available for production | PHASE-7 | Builder approval status | BLK-003 |

## 5. Rejected alternatives

| Date | Alternative | Rejected because | ADR |
|------|-------------|------------------|-----|
| 2026-07-24 | Custom RetroPick exchange | Polymarket is venue | ADR-001 |
| 2026-07-24 | Direct Gamma/CLOB from clients | BFF anti-corruption layer | ADR-002 |
| 2026-07-24 | Extend legacy epoch APIs | Frozen at `/api/v1/legacy/markets/*` | — |
| 2026-07-24 | Flutter/React Native for Android | Kotlin+Compose required | ADR-006 |
| 2026-07-24 | Pixel-copy Polymarket UI | Clean-room boundary | ADR-007 |

## 6. Open questions

Delegated to [research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md](../research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md). Do not resolve by guessing — log assumption with expiry instead.
