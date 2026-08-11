# Decision and Assumption Log

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1

## Description

This chronological ledger records non-obvious decisions and **expiring** assumptions for Markets V1 so later work does not re-litigate ADRs or silently trust stale upstream facts (pUSD collateral, CLOB V2 shapes, Builder availability).

Append Decision rows with ADR/doc + task ID; Assumptions with Expiry + Revalidation; Rejected alternatives with rationale. Never resolve open questions by invention — log an assumption or blocker instead. Scope changes require ADR + human approval first.

## 2026-08-11 — Release Factory v2 migration decisions (harness/markets-release-factory-v2)

| Type | Decision / finding | Rationale |
|------|--------------------|-----------|
| Decision | Execution harness migrated from `.dev/markets-v1/agent-harness/` to `.harness/products/markets-v1/` via `git mv` (single canonical copy, history preserved). Old dir holds a compatibility README only. | `.dev/markets-v1` stays product/spec docs; execution policy/evidence belongs in `.harness`. |
| Finding | `apps/fe-v1` **does not exist** in the current tree; it was renamed to `apps/web` (DECISIONS D15, package `@retropick/markets-web`). The v2 master prompt assumed the opposite. **Resolution:** `apps/web` is the canonical Web release surface; all docs updated accordingly. | Runtime truth (repo tree + D15) wins over prompt assumption. |
| Finding | `apps/ops-web` referenced in old project-context.md does not exist. Removed from release docs. | Runtime truth. |
| Finding | `.harness/state/rag.sqlite` (45 MB) was Git-tracked. Removed from tracking (`git rm --cached`), `.gitignore` extended; `.harness/state` is now README-only. | Generated runtime state must not live in Git. |
| Finding | `implementation-manifest.yaml` `current_phase` = PHASE-2 while verification evidence exists through PHASE-4 and HEAD integrates P1–P4 system proof. Docs lag execution. | Phase doc is intent, not runtime truth — Git/tests/CI/staging are truth. Reconcile before trusting labels. |
| Finding | `rag.config.json` had contradictory include/exclude for `contracts/legacy-pool-v1` and referenced nonexistent `apps/fe-v1`. Rewritten Markets-first. | Fix contradictions; Markets release RAG must not prioritize legacy material. |
| Decision | Root `package.json` `dev:fe-v1` script filters `@retropick/markets-v1`, but the actual package is `@retropick/markets-web`. Manifest `commands.dev` fixed to the working filter; root package.json left untouched (product change out of scope for harness branch). | Machine consumers of the manifest get a working command; product code changes stay off the harness branch. |
| Decision | `.dev/prompt/*.md` master prompts and `scripts/seed-kanban-retropick-v1.sh` (legacy board) preserved verbatim as historical material; ORCHESTRATOR.md banner-marked legacy. | Do not erase history; distinguish ACTIVE vs REFERENCE/LEGACY. |
| Decision | Android gitlink (`apps/android`) = `266731c69d…` is **behind** Android upstream main (`e962490d…`); `/opt/retropick-android` not yet cloned. Gitlink updates require explicit SHA + evidence (sync-android-gitlink.sh). | Never auto-follow upstream; R0-002 reconciles this. |
| Decision | Release-state and evidence live outside Git at `~/.local/state/retropick-harness/`. Only evidence moves gates green. | Runtime truth ≠ doc fiction. |

Use before marking a task `done` if you made an architecture/product choice or relied on time-sensitive upstream claims. Companion open questions live in `../research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md`. This log is not a substitute for `BLOCKERS_AND_HUMAN_APPROVALS.md`.

## 0. Developer intent (5W+1H)

Chronological ledger of non-obvious decisions and **expiring** assumptions for Markets V1. Agents record choices here so later work does not re-litigate ADRs or silently trust stale upstream facts (pUSD collateral, CLOB V2 shapes, Builder availability).

| Dimension | Intent |
|-----------|--------|
| **Who** | Implementing agents (append rows); orchestrator/reviewers (audit); humans for scope-changing decisions. |
| **What** | Decisions table (ID, ADR/doc, task), Assumptions with expiry + revalidation path, Rejected alternatives, pointer to open-questions research doc. |
| **When** | Before marking a task `done` if you made an architecture/product choice or relied on time-sensitive upstream claims; when rejecting an alternative; when an assumption’s Expires date is near or upstream changelogs move. |
| **Where** | This log; ADRs under `../architecture/adr/`; open questions in `../research/OPEN_QUESTIONS_AND_EXPIRING_ASSUMPTIONS.md`. |
| **Why** | Trading/launch phases fail when PHASE-0 assumptions silently expire. Guessing answers to open questions creates false confidence and invariant risk. |
| **How** | Add Decision with ADR link + task ID; add Assumption with Expires + Revalidation; never resolve open questions by invention — log assumption or blocker instead. Scope changes require ADR + human approval first. |

### In / out

- **In:** Recording D-*/A-* rows tied to tasks; linking ADRs; noting rejected alternatives with rationale; citing IDs from handoffs/evidence.
- **Out:** Quietly changing ADR-001 venue model in code without a decision row; deleting expired assumptions without revalidation notes; treating this log as a substitute for `BLOCKERS_AND_HUMAN_APPROVALS.md`.

### What “done” means for an agent using this log

Any non-obvious choice from your task is already present or newly appended; assumptions you depended on are still within Expires or were revalidated/escalated; handoff mentions new D-*/A-* IDs when created.

### How (procedure)

1. Before coding a contested approach, search Decisions / Rejected alternatives.
2. If choosing among options, prefer an existing ADR; else draft ADR + Decision row.
3. If relying on Polymarket upstream detail, ensure an Assumption row exists with expiry.
4. On upstream change, revalidate and update the row (or open a blocker).
5. Reference Decision/Assumption IDs from verification evidence when relevant.

Existing rows such as D-001 (no custom exchange) and A-003 (CLOB V2 registry) illustrate the expected density — match that style rather than vague prose.

### Worked example

Agent preparing CLOB submit checks A-003 (CLOB V2 endpoint registry). Upstream changelog moved a path: they revalidate against the evidence register, update A-003’s Expires/Revalidation, and if still ambiguous file a research blocker rather than hardcoding a guessed URL. They do not reopen D-001 “no custom exchange” in a drive-by refactor — that remains ADR-001.


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
