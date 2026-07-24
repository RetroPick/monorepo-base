# Executive outcome — Markets V1 documentation baseline

**Date:** 2026-07-24  
**Status:** documentation baseline complete (not product implementation)

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

119 files under `.dev/markets-v1/` — see [00_DOCUMENT_MAP.md](00_DOCUMENT_MAP.md).

## Phase plan summary

| Phase | Name | Status |
|-------|------|--------|
| PHASE-0 | Discovery and Spec Freeze | **current** |
| PHASE-1 | Foundation and Read Markets | planned |
| PHASE-2 | Account Wallet and Funding | planned |
| PHASE-3 | Web Trading Core | planned |
| PHASE-4 | Portfolio, Redemption, Withdrawal | planned |
| PHASE-5 | Android Compose Markets | planned |
| PHASE-6 | Hardening, CI/CD, SRE | planned |
| PHASE-7 | Production Launch | planned |
| PHASE-8 | Post-V1 Advanced | planned |

## Critical blockers

### Implementation blockers
- Android Gradle project does not exist.
- CLOB integration, wallet flows, and eligibility geoblock not implemented.
- OpenAPI covers stub endpoints only.

### External/upstream blockers
- Contract addresses and CLOB V2 details require revalidation against live Polymarket docs.
- Builder Program approval for production attribution.

### Legal/policy blockers
- Per-region legal review before production trading enablement.
- Google Play financial-features declaration for Android.

### Human-approval blockers
- PHASE-0 exit gate: human approval of V1 scope (see phases/PHASE-0-DISCOVERY-AND-SPEC-FREEZE.md).

## First executable phase

**PHASE-0** is ready for human review and scope sign-off. Not ready to skip to PHASE-1 until exit gate cleared.

**First three agent tasks (do not execute without approval):**
1. `MKT-P0-001` — Complete evidence register revalidation
2. `MKT-P0-002` — Finalize capability matrix sign-off
3. `MKT-P0-003` — ADR review and human approval of V1 scope

## Verification summary

| Check | Result |
|-------|--------|
| Files in document map | 119/119 present |
| Harness manifest | PHASE-0–8 populated |
| Task graph | 18 PHASE-0/1 tasks defined |
| Cross-document invariants (§23) | See agent-harness/INVARIANT_CHECK.md |
| Product code implemented | **No** — documentation only |

## Provisional documents

All docs marked `draft` in 00_DOCUMENT_MAP.md. Revalidate upstream claims before PHASE-1 implementation.
