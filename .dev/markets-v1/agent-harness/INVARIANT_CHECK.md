# Cross-document invariant check (master prompt §23)

**Status:** reviewed
**Last updated:** 2026-07-25
**Method:** Manual review of PRD, ADRs, agent contract, architecture, security, and intelligence docs against master prompt §23.

Agents MUST re-run this checklist before any phase exit gate or product-code merge.

## Description

This file is the merge and phase-exit safety net for all **28** master-prompt §23 cross-document invariants. Treat it as an operational checklist, not optional background reading. The historical clean pass across the corpus is not a free pass — re-run against your diff before merge or phase exit.

Rows cover venue/custody/Android/money/reconcile/eligibility/OSS/intelligence/copy-trading/arb labeling/isolation. Map impacted rows from your paths, run Verification `rg` commands, attach output to a filled `VERIFICATION_EVIDENCE_TEMPLATE`, and stop for ADR+human approval if an invariant must change.

Never merge on a violated row, and never “fix the docs to match the bug.” Phase exit-gate tasks must re-run and reference this checklist from `PHASE_GATE_TEMPLATE` evidence links.

## 0. Developer intent (5W+1H)

This file is the merge and phase-exit safety net for all **28** master-prompt §23 cross-document invariants. Treat it as an operational checklist, not optional background reading. Header **Status: reviewed** and the 2026-07-25 contradiction scan describe a historical clean pass across 121 docs — you must **re-run** against your diff before merge or phase exit.

| Dimension | Intent |
|-----------|--------|
| **Who** | Every Markets V1 implementation agent; PR reviewers; orchestrator before advancing `current_phase` or approving a phase exit gate. |
| **What** | The 28-row invariant table (venue/custody/Android/money/reconcile/eligibility/OSS/intelligence/copy-trading/arb labeling/isolation), verification `rg` commands, contradiction-scan practice, and pre-done obligations. |
| **When** | Before marking any task `done` that touches Markets product docs or code; before phase exit-gate tasks (`MKT-P*-010` / `MKT-P0-008`); before merging Markets product PRs; whenever a change might weaken an ADR boundary. |
| **Where** | This checklist; primary sources named per row (ADRs, security, intelligence, phase specs, OpenAPI); attach command output to a filled `VERIFICATION_EVIDENCE_TEMPLATE` artifact. |
| **Why** | Contradictions — PRISM positions in Markets, float money, VPN geoblock bypass, AI-triggered orders, auto copy trading, “guaranteed arb” — are launch-blocking and often invisible in a single-file review. |
| **How** | Diff → map impacted rows → run Verification commands (+ targeted greps) → attach evidence → stop for ADR+human approval if an invariant must change → never merge on a violated row. |

### How agents use the 28-invariant checklist before merge

1. **Skim all 28 rows** so you do not miss an adjacent boundary (e.g. submit code also touches #15 reconcile-before-retry and #26 fresh eligibility/preview).
2. **Deep-check rows your paths can break**
   - Catalog/OpenAPI/money → #13 fixed-point; #1–#4 venue/no custom exchange
   - Wallet/auth → #8 signer≠account wallet; #9 no raw keys; #16/#21 fail-closed / no VPN bypass
   - Orders → #10 auth binds action; #15 unknown state reconcile; #26 every order needs fresh checks
   - Android → #11 Compose; #12 shared versioned APIs
   - Intelligence → #22–#25, #27–#28 provenance, descriptive labels, no auto copy, no guaranteed arb, isolation from trading
   - Launch/ops → #17 rollback+evidence; #18 production enablement gates; OSS → #19–#20
3. **Run the Verification commands** block from repo root; save redacted stdout in verification evidence.
4. **If an invariant must change**, do not “fix the docs to match the bug.” File an ADR and human approval first (see Agent obligation below the checklist).
5. **Phase exit**: re-run before exit-gate approval; reference this file from `PHASE_GATE_TEMPLATE` evidence links.
6. **Honesty**: historical ✅ cells are not a free pass for new code. Your merge re-validates applicability to the diff and related docs.

### What “done” means here

- **Task/PR:** impacted invariants checked; greps attached; no violated row.
- **Phase exit:** checklist re-run recorded; no open contradiction without accepted risk in blockers.
- **Invariant change request:** blocked pending ADR + approval — task not marked done.

### Worked example

Agent finishing `MKT-P1-001` (OpenAPI money fields) runs `rg "float64|binary float"` over OpenAPI and backend money docs (#13), greps Markets copy for PRISM-position claims (#1) and “custom exchange” ADR conflicts (#3–#4), pastes results into verification evidence, then marks the task done.

Later, an order-submit change that auto-retries without venue reconcile would fail #15 and #26 — the agent must add reconcile-first behavior (or set `blocked`) before merge, not weaken or delete checklist rows to match broken behavior.


## Checklist (28 invariants)

| # | Invariant | Status | Primary sources |
|---|-----------|--------|-----------------|
| 1 | Markets V1 creates Polymarket positions, not PRISM positions | ✅ | ADR-001, 01_EXECUTIVE_PRODUCT_SPEC.md |
| 2 | Polymarket is the venue and settlement authority | ✅ | ADR-001, polymarket/*, SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md |
| 3 | RetroPick does not run a separate exchange or pool for Markets V1 | ✅ | ADR-001, 02_SCOPE_AND_CAPABILITY_MATRIX.md |
| 4 | No custom Markets contract is required by default | ✅ | ADR-001, CONTRACT_ABI_AND_ADDRESS_REGISTRY.md |
| 5 | pUSD/current collateral details are based on current CLOB V2 evidence | ✅ | research/evidence-register.yaml, FUNDS_DEPOSIT_AND_WITHDRAWAL.md |
| 6 | Standard and Negative Risk markets route differently when required | ✅ | NEGATIVE_RISK_AND_AUGMENTED_MARKETS.md, ADR-002 |
| 7 | Combos is capability-gated | ✅ | COMBOS_CAPABILITY_GATE.md, MKT-FR-090 |
| 8 | Signer and account-wallet addresses are distinct concepts | ✅ | ADR-003, AUTHENTICATION_AND_ACCOUNT_WALLETS.md |
| 9 | RetroPick does not hold raw user private keys | ✅ | ADR-003, SIGNING_AND_TRANSACTION_INTEGRITY.md |
| 10 | User authorization exactly binds the submitted action | ✅ | ADR-003, ORDER_LIFECYCLE.md, MKT-SEC-002 |
| 11 | Android uses native Kotlin + Jetpack Compose | ✅ | ADR-006, COMPOSE_APP_ARCHITECTURE.md |
| 12 | Android consumes shared versioned RetroPick Markets APIs | ✅ | ADR-004, GRADLE_MODULE_GRAPH.md |
| 13 | Money is fixed-point/base-unit, never binary floating point | ✅ | MKT-NFR-060, DOMAIN_MODEL_AND_STATE_MACHINES.md |
| 14 | Backend data is a projection, not asset ownership authority | ✅ | SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md, INDEXING_RECONCILIATION_AND_REORGS.md |
| 15 | Unknown transaction/order states reconcile before retry | ✅ | ORDER_LIFECYCLE.md, FAILURE_DOMAINS_AND_DEGRADED_MODES.md |
| 16 | Unsupported jurisdictions fail closed | ✅ | AUTH_SESSION_AND_ELIGIBILITY.md, MKT-FR-021 |
| 17 | Each phase has rollback and evidence | ✅ | phases/*, PHASE_GATE_TEMPLATE.md, platform/RELEASE_ROLLBACK_AND_CHANGE_MANAGEMENT.md |
| 18 | Production enablement follows security, legal, Builder, and operations gates | ✅ | BLOCKERS_AND_HUMAN_APPROVALS.md, PHASE-7-PRODUCTION-LAUNCH.md |
| 19 | Public source availability is never treated as a license to copy | ✅ | ADR-007, OPEN_SOURCE_REFERENCE_AUDIT.md |
| 20 | Missing/ambiguous licenses force clean-room behavioral reimplementation | ✅ | ADR-007, open-source-provenance.yaml |
| 21 | No VPN/proxy/relay behavior bypasses regional restrictions | ✅ | ABUSE_FRAUD_AND_RATE_LIMITS.md, AUTH_SESSION_AND_ELIGIBILITY.md |
| 22 | Intelligence signals are deterministic, versioned, evidence-linked, and retractable | ✅ | ADR-008, SIGNAL_PROVENANCE_CALIBRATION_AND_RETRACTIONS.md |
| 23 | Whale/smart-money/unusual-activity score is descriptive, uncertain, never an insider accusation | ✅ | WHALE_AND_LARGE_TRADE_DETECTION.md, UNUSUAL_ACTIVITY_HEURISTICS.md |
| 24 | AI may narrate verified deterministic evidence but may not classify, invent metrics, or trigger orders | ✅ | TRADER_INTELLIGENCE_PRODUCT_SPEC.md, ADR-009 |
| 25 | No automatic or autonomous copy trading exists in V1 | ✅ | ADR-009, 02_SCOPE_AND_CAPABILITY_MATRIX.md |
| 26 | Every order still requires fresh eligibility, preview, integrity checks, and explicit authorization | ✅ | ORDER_LIFECYCLE.md, MKT-FR-030, MKT-SEC-002 |
| 27 | Theoretical discrepancies are not labeled guaranteed arbitrage | ✅ | RELATIONSHIP_AND_ARBITRAGE_SCANNER.md |
| 28 | Intelligence failure is isolated from trading, balances, and settlement | ✅ | FAILURE_DOMAINS_AND_DEGRADED_MODES.md, BACKEND_ARCHITECTURE.md |

## Verification commands

```bash
# Product boundary
rg -l "PRISM position" .dev/markets-v1/ --glob '*.md'
rg "custom exchange" .dev/markets-v1/architecture/adr/

# Custody and eligibility
rg "raw.*private.?key|private key custody" .dev/markets-v1/security/
rg "fail closed" .dev/markets-v1/backend/

# Intelligence boundaries
rg "copy trading|auto.?copy" .dev/markets-v1/intelligence/
rg "guaranteed arbitrage" .dev/markets-v1/intelligence/

# Money representation
rg "float64|binary float" .dev/markets-v1/backend/ schemas/openapi/

# Android stack
rg "Flutter|React Native" .dev/markets-v1/android/
```

## Contradiction scan result

**2026-07-25:** No contradictions found across 121 reviewed documents. Re-run before PHASE-1 code merge and at each phase exit gate.

## Agent obligation

Before marking any task `done`:

1. Confirm no edit violates any row above.
2. If an invariant must change, file an ADR and human approval first.
3. Attach grep output or review notes to verification evidence.
