# Markets V1 legacy purge authority inventory

## Description

Evidence-only, full-tree purge authority for the current landing head. It does not mutate product, CI, workflow, configuration, deployment, or external systems. Every tracked entry receives one path-role disposition; external decisions are explicit blockers rather than `UNCERTAIN_REVIEW`.

## 0. Developer intent (5W+1H)

| Dimension | Intent |
|---|---|
| Who | Release orchestrator and named path owners. |
| What | A machine-validated full-tree deletion/rewrite/retention authority. |
| When | Before any R1 purge mutation. |
| Where | Current tracked tree at the committed landing head. |
| Why | Avoid deleting canonical Markets code while eliminating archived/dead units safely. |
| How | Exact tracked-path enumeration, path-role classification, reference-source closure, and ordered ownership waves. |

## Baseline

- Generated head: `98503700b70f616b67618c79c8e37e743c68507f`
- Baseline before initial evidence: `fff54010b32388e584959163fb02de775968eb02`
- Branch: `integration/markets-v1-main-cleanup`
- Current phase: `PHASE-2`
- Current tracked entries: `9002`; archive entries: `6106`.
- Gitlinks: `apps/android` = `5827aa536fab9cf266f8a758f8a6811bec175751`; archived treasury gitlink = `3fab6622c2ca5727d6e49385f7695f23f12216c8`.

## Deterministic classification counts

| Classification | Count |
|---|---:|
| `DELETE_LEGACY` | 6607 |
| `EXTERNAL_DECISION_REQUIRED` | 143 |
| `KEEP_MARKETS` | 528 |
| `KEEP_SHARED` | 1468 |
| `REWRITE_FOR_MARKETS` | 256 |

`UNCERTAIN_REVIEW`: **0**. `EXTERNAL_DECISION_REQUIRED` is not a semantic uncertainty: it records decisions that cannot be established from Git and blocks only the affected external action.

The exact top-level × classification deletion/count matrix is `top_level_classification_counts` in the companion JSON; it covers every root/workspace/package/pnpm/turbo/tsconfig/Docker/compose/scripts/workflows/harness/agent/docs/deploy/contracts/apps/packages/references path rather than a keyword-selected subset.

## Coverage and retained-subtree rules

- The JSON has one record for every `git ls-files` entry, including both mode-160000 gitlinks.
- `archive/**`: all 6106 entries are `DELETE_LEGACY`, with archive deletion ordered last.
- `android/**`: all 150 entries are `DELETE_LEGACY`; canonical Android is only the `apps/android` gitlink.
- `apps/landing-web/sources/**`: all 195 entries are `DELETE_LEGACY`; `src/retro-waitlist-page/**`: all 111 entries are `DELETE_LEGACY`.
- Canonical BFF, Markets web, OpenAPI/AsyncAPI, and `packages/polymarket/**` are path-protected `KEEP_MARKETS`; the 19 reviewer-named canonical paths are enumerated in JSON validation contract.

## Active archive-prefix source closure

- Exactly **65** actionable, non-archive, non-generated/non-reconciliation-evidence tracked sources containing `archive/` are individually listed in JSON `active_archive_prefix_sources`, with their disposition, owner, occurrence count, and required action.
- Every source must be deleted or rewritten before wave 4; generated `graphify-out/**` and reconciliation evidence are intentionally excluded from this 65-source active closure and are separately recorded.

## Ordered purge plan

| Wave | Owners | Deterministic action |
|---:|---|---|
| 1 | rp-release-orchestrator/rp-sre-release | Delete dead non-archive units and retire legacy workflow/check; first resolve external branch protection. |
| 2 | rp-sre-release/rp-recovery-architect | Rewrite control surfaces, remove all 65 active archive-prefix sources, reconcile Go 1.25 module with CI/docs. |
| 3 | product owners | Resolve Vercel and legal external decisions; execute resulting landing/legal disposition. |
| 4 | rp-recovery-architect | Verify zero active archive references outside retained evidence, then delete archive/ as one final unit. |

## Rewrite authority

The JSON `rewrite_list` is the exact path-to-expected-replacement list. It covers root/workspace/package/pnpm/turbo/tsconfig/Docker/compose/Makefile-equivalent, scripts, workflows, harness, agents, docs, deploy and configuration surfaces. Required specifics: remove the legacy guard and its CI/docs callers; retain a positive Markets-boundary check only if separately approved; rewrite gitlink scripts for only `apps/android`; remove archive/PRISM/old-Android claims from retained guidance; reconcile CI/docs Go declaration to module Go `1.25`; regenerate `pnpm-lock.yaml` only after workspace deletion.

## Preserved-path evidence summary

- `KEEP_MARKETS`: manifest-defined BFF (`apps/backend/internal/markets/**`), web (`apps/web/**`), canonical schemas, Polymarket package, and the approved Android gitlink.
- `KEEP_SHARED`: reference corpora, shared config/tooling, and reconciliation evidence with no product runtime/deploy claim.
- No current Markets canonical code is classified delete/rewrite from a keyword match; the records give location-based reason and explicit replacement.

## External actions (evidence only; no credentials used)

1. Vercel/project owner must inventory real project roots, build commands, environment bindings and domains before deciding the canonical `apps/landing-web/**` unit.
2. Legal owner must decide whether tracked legacy Terms/Privacy are deleted or reviewed/relocated to Markets pages and routes.
3. Repository administrator must check branch-protection required status names before retiring legacy workflows/checks.
4. These are external facts; no external mutation was performed. Because they affect execution authority, this inventory is **BLOCKED_EXTERNAL_DECISIONS**, not `R0_READY`.

## Current CI and toolchain observations

- `apps/backend/go.mod` declares Go `1.25`; `.github/workflows/ci.yml` and `docs/engineering/local-development.md` currently declare Go `1.26`. Wave 2 must align CI/docs to the module-supported `1.25` line unless an independently verified upgrade changes the module.
- The current workflow invokes `scripts/check-active-legacy-refs.sh`; that script is `DELETE_LEGACY`, so its workflow/docs callers are exact `REWRITE_FOR_MARKETS` records. A replacement may only be a positive Markets-boundary check, not a legacy-name blacklist.
- `archive/contracts/legacy-pool-v1/treasury-vault-eth` is the archived gitlink slated for final archive deletion; `apps/android` is the only protected gitlink.

## Validation contract

The companion JSON is authoritative for programmatic validation: exact coverage, no duplicate/nontracked records, required fields, zero unresolved `UNCERTAIN_REVIEW`, archive-delete invariant, phase `PHASE-2`, exact Android gitlink, 65 active archive-prefix sources, and path protection for canonical Markets code.

## R0 status

**BLOCKED_EXTERNAL_DECISIONS — not R0_READY.** Deterministic repository-local deletion/rewrite waves are ready to be assigned, but the landing/Vercel and legal execution choices cannot be inferred from the tracked tree.
