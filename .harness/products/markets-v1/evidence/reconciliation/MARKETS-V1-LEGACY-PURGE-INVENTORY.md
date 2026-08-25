# Markets V1 legacy purge inventory

## Description

Forensic, read-only R0 inventory of every tracked archived item and every active-tree legacy-signal candidate at `fff54010b32388e584959163fb02de775968eb02`. This is a classification baseline, not authorization to delete or rewrite.

## 0. Developer intent (5W+1H)

| Dimension | Intent |
|---|---|
| Who | Release orchestrator and path owners use this evidence for scoped R1+ cleanup. |
| What | Classify legacy candidates with reachability and replacement evidence. |
| When | Before any legacy purge mutation. |
| Where | Current tracked tree on `integration/markets-v1-main-cleanup`. |
| Why | Prevent deletion of active Markets/shared surfaces and surface mixed control files. |
| How | Programmatic tracked-file inventory plus content signal and bounded active reference graph. |

## Baseline

- Starting commit: `fff54010b32388e584959163fb02de775968eb02`
- Branch: `integration/markets-v1-main-cleanup` (no upstream configured at capture)
- Tree at capture: clean
- Current phase: `PHASE-2`
- Gitlinks: `apps/android` = `5827aa536fab9cf266f8a758f8a6811bec175751`; `archive/contracts/legacy-pool-v1/treasury-vault-eth` = `3fab6622c2ca5727d6e49385f7695f23f12216c8`.
- Tracked files: 9000; tracked under `archive/`: 6106.

## Candidate counts

| `DELETE_LEGACY` | 6166 |
| `KEEP_MARKETS` | 141 |
| `KEEP_SHARED` | 89 |
| `REWRITE_FOR_MARKETS` | 29 |
| `UNCERTAIN_REVIEW` | 31 |

### By top-level path

| `.ai` | 2 |
| `.dev` | 109 |
| `.dockerignore` | 1 |
| `.docs` | 1 |
| `.env.example` | 1 |
| `.github` | 2 |
| `.gitignore` | 1 |
| `.harness` | 17 |
| `.references` | 1 |
| `AGENTS.md` | 1 |
| `CONTRIBUTING.md` | 1 |
| `DECISIONS.md` | 1 |
| `HARNESS.md` | 1 |
| `ORCHESTRATOR.md` | 1 |
| `PRODUCTION.md` | 1 |
| `README.md` | 1 |
| `android` | 54 |
| `apps` | 30 |
| `archive` | 6106 |
| `contracts` | 2 |
| `deploy` | 3 |
| `docs` | 15 |
| `graphify-out` | 7 |
| `package.json` | 1 |
| `packages` | 4 |
| `pnpm-lock.yaml` | 1 |
| `pnpm-workspace.yaml` | 1 |
| `references` | 80 |
| `schemas` | 2 |
| `scripts` | 8 |

The machine-readable companion contains **all 6456 candidate records**, including every one of the 6106 tracked `archive/` paths. Every record has: path, reason, inbound/outbound references, runtime/CI/deployment reachability, replacement, disposition, and owner.

## Findings

1. `archive/` is **not currently deletable as a single mutation**: active `package.json` scripts run `archive/scripts/RETRODEPLOYER` and Foundry against `archive/contracts/legacy-pool-v1`; `.github/workflows/contracts.yml` is manually dispatchable and also builds that tree. The active guard explicitly excludes `archive/`, as intended. After those entry points and any required historical-retention decision are resolved, the archive is classified `DELETE_LEGACY` as a unit.
2. Mixed active files needing scoped rewrite rather than deletion: `package.json` (deprecated RETRODEPLOYER/Forge scripts while retaining Markets scripts) and any active operational file explicitly labelled `REWRITE_FOR_MARKETS` in JSON.
3. `scripts/check-active-legacy-refs.sh` is a required Markets safeguard, not a deletion target; its legacy text is deliberate fail-closed policy.
4. `pnpm-workspace.yaml` is shared tooling, not evidence for removal. PRISM paths remain `KEEP_SHARED` because Markets governance says PRISM is separately out of scope; no filename-only deletion was made.
5. External cleanup recommendations (no mutation made): remove/retire the archived `contracts.yml` dispatch workflow with the legacy contracts entry points; inspect branch-protection rules outside this repo so retired checks are not required; inspect Vercel project/environment bindings for retired docs/PRISM/legacy deployments; reconcile Go toolchain declarations (`.github/workflows/ci.yml` and `docs/engineering/local-development.md` state Go 1.26+; backend module/toolchain must be checked by owner before any change).

## Unresolved uncertainties

- `scripts/smoke-base-sepolia.sh` has no proven active caller in this inventory and needs owner confirmation before deletion.
- Any `UNCERTAIN_REVIEW` path in the companion JSON needs semantic owner review; do not execute deletion from a signal hit alone.
- Archive retention (historical/legal/audit) is a release decision separate from runtime reachability.

## Validation

- Candidate construction and field completeness are validated by `validate_legacy_inventory.py` in the command evidence of this task.
- Coverage rule: every tracked `archive/` file is present in the JSON records.
- No product, CI, workflow, configuration, deployment, or source path was modified by this R0 task.

**R0_READY** — evidence is complete; mutation work remains gated on owner review of the explicit external/uncertain items.
