# Markets V1 legacy purge authority inventory

## Description

Evidence-only, full-tree purge authority for the current landing head. It does not mutate product, CI, workflow, configuration, deployment, or external systems. Every tracked entry receives one of the five allowed path-role dispositions; future external audits are evidence-only follow-up, not a sixth classification or a repository-local blocker.

## 0. Developer intent (5W+1H)

| Dimension | Intent |
|---|---|
| Who | Release orchestrator and named path owners. |
| What | A machine-validated full-tree deletion/rewrite/retention authority. |
| When | Before any R1 purge mutation. |
| Where | Current tracked tree at the committed landing head. |
| Why | Avoid deleting canonical Markets code while eliminating archived/dead units safely. |
| How | Exact tracked-path enumeration, executable rewrite contracts, reference-source closure, and ordered ownership waves. |

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
| `KEEP_MARKETS` | 528 |
| `KEEP_SHARED` | 1605 |
| `REWRITE_FOR_MARKETS` | 262 |

`UNCERTAIN_REVIEW`: **0**. The only classifications in this authority are `DELETE_LEGACY`, `KEEP_MARKETS`, `KEEP_SHARED`, `REWRITE_FOR_MARKETS`, and `UNCERTAIN_REVIEW`.

The exact top-level × classification matrix is `top_level_classification_counts` in the companion JSON. It is recomputed from every tracked path, not a keyword-selected subset.

## Coverage and retained-subtree rules

- The JSON has one record for every `git ls-files` entry, including both mode-160000 gitlinks.
- `archive/**`: all 6106 entries are `DELETE_LEGACY`, with archive deletion ordered last.
- `android/**`: all 150 entries are `DELETE_LEGACY`; canonical Android is only the `apps/android` gitlink.
- `apps/landing-web/sources/**`: all 195 entries are `DELETE_LEGACY`; `src/retro-waitlist-page/**`: all 111 entries are `DELETE_LEGACY`.
- Canonical BFF, Markets web, OpenAPI/AsyncAPI, and `packages/polymarket/**` are path-protected `KEEP_MARKETS`; the 19 reviewer-named canonical paths are enumerated in JSON validation contract.

## Active archive-prefix source closure

- Exactly **65** actionable, non-archive, non-generated/non-reconciliation-evidence tracked sources containing `archive/` are individually listed in JSON `active_archive_prefix_sources`.
- Every closure source is now `DELETE_LEGACY` or `REWRITE_FOR_MARKETS`; all rewrite members carry an exact wave-2 `rewrite_list` operation and verification command.
- The four formerly contradictory retained sources are `REWRITE_FOR_MARKETS`: `.ai/AGENTS-opensrc.md`, `.dev/README.md`, `.dev/prompt/RETROPICK MARKETS V1 — SMART MONEY INTELLIGENCE LAUNCH V1 (1).md`, and `references/polymarket/polyterm/docs/AGENT_COOKBOOK.md`.
- Generated `graphify-out/**` and reconciliation evidence are intentionally excluded from this 65-source active closure and are separately recorded.

## Ordered purge plan

| Wave | Owners | Deterministic action |
|---:|---|---|
| 1 | rp-release-orchestrator/rp-sre-release | Delete only `DELETE_LEGACY` records with no predecessor rewrite; record branch-protection evidence before retired workflow mutation. |
| 2 | Named `rewrite_list` owners | Execute and verify every wave-2 rewrite contract, including all active archive-prefix sources. |
| 3 | legal owner / rp-web | Execute only the two preservation-only legal rewrite contracts after legal-review evidence; preserve text at current Markets legal destinations before retiring old-path bodies. |
| 4 | rp-recovery-architect | Re-scan active references and delete `archive/**` only after each closure member has passed its contract verification. |

## Rewrite authority

The JSON `rewrite_list` contains exactly one object for every `REWRITE_FOR_MARKETS` record. Each object has an exact path, owner, stale literal list derived from the current source, canonical Markets anchor, dependency wave, concrete in-place edit/preservation action, executable verification command, and postcondition. `records[].current_replacement` is byte-identical to that object's `action`; no record uses a generic or circular replacement sentence.

Terms and Privacy are preservation-only rewrites: their complete text must first be copied into `docs/markets-v1/legal/Terms.md` and `docs/markets-v1/legal/PrivacyPolicy.md`, respectively, with legal review recorded separately. Deletion is not an authorized outcome.

## External actions (evidence only; no credentials used)

1. Vercel/project owner must inventory real project roots, build commands, environment bindings and domains before any future landing deployment mutation. Repository authority preserves the canonical, nonduplicate `apps/landing-web/**` implementation as `KEEP_SHARED`; copied `sources/**` and `src/retro-waitlist-page/**` remain `DELETE_LEGACY`.
2. Legal owner must review the preservation/relocation of tracked Terms/Privacy content into the current Markets legal documentation/routes. These records are `REWRITE_FOR_MARKETS`, never deleted.
3. Repository administrator must check branch-protection required status names before executing retired-workflow changes; the tracked CI/workflow records are already deterministically classified.
4. These are evidence-only external follow-ups; no external mutation was performed, and none blocks deterministic repository deletion authority.

## Validation contract

The companion JSON is authoritative for programmatic validation: exact coverage, no duplicate/nontracked records, required fields, zero unresolved `UNCERTAIN_REVIEW`, archive-delete invariant, phase `PHASE-2`, exact Android gitlink, active archive-prefix closure, canonical Markets protection, and one-to-one executable `rewrite_list` equality.

## R0 status

**R0_READY.** A worker can mechanically execute every `DELETE_LEGACY` or `REWRITE_FOR_MARKETS` record using the path-level list and verification contracts; repository deletion remains prohibited until the preceding waves complete.
