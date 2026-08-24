# R0-FA-001 reconciliation report

## Provenance and starting state

- integration HEAD / main: `81f82e246198f1b813492893d7e8f2486c83630e` / `81f82e246198f1b813492893d7e8f2486c83630e`
- immutable feature evidence: `65c934cebd686fee0229f062649998443bce5528`
- merge base: `a8edf7dd3e7195aea6f1c826fcf2199ead525162`
- local integration worktree status before evidence: clean (verified by `git status --short --branch`)
- external `/opt/retropick-android` status: dirty and `main...origin/main [behind 16]`; it was inspected only and is not a trustworthy clean source tree for modification.
- safety refs: `refs/reconcile-safety/20260824T181731Z/main` = `81f82e246198f1b813492893d7e8f2486c83630e`; `feature-android-update` = `65c934cebd686fee0229f062649998443bce5528`; `merge-base` = `a8edf7dd3e7195aea6f1c826fcf2199ead525162`.

## Divergence

- Merge-base → main: 5 commits.
- Merge-base → feature: 13 commits.
- Feature inventory: 507 paths (`387` added, `120` modified), matching local `git diff --name-only`.

### Complete feature commit list

- `65c934cebd686fee0229f062649998443bce5528` — fix(ui): remove bracket counts from tab labels for a cleaner look
- `c51823d19d493b337909c4f7a6d1dfc2f2315719` — feat(intelligence): expand Top Traders, Whales, and Smart Money leaderboard datasets to 25+ entries each
- `3c97d48d52383741bf4d6ac71132839d6c96b27d` — feat(intelligence): expand whale feed orders, top 20 smart money funds, and AI alpha signals
- `2e4ff75ae522170a8ce2318a5cc798a2a1230998` — feat(web): add persistent wallet session, deposit modal, trading simulation, and dynamic watchlist
- `463ee8e3369a2571dd5152ebecc746a924074bc9` — feat(web): update markets UI, polymarket integration, components, and pages
- `16e56593ea25356d5ed80941b25f2f14d54a5874` — Merge remote-tracking branch 'origin/main' into feat/android-update
- `d352e1f296cae452c866f0269e918993eae54ef8` — Merge remote-tracking branch 'origin/main' into feat/android-update
- `22db0254e80d1dc3af06844f08c489b650090f39` — feat(android): sync latest RetroPick-Android with harmonized Intelligence & Copy Strategy theme
- `69d236d04ad990af159cc1e7bcba41e4c9f35e86` — Merge branch 'main' of https://github.com/RetroPick/monorepo-base into feat/android-update
- `c93faff45a572a3287dbbc7c5599ea9a11aa1862` — feat(android): update Android native code and limit order ticket UI
- `41816fc9c741f6794d12f4d5896c9dc8f65d87b4` — Merge branch 'main' of https://github.com/RetroPick/monorepo-base into feat/android-update
- `2a040520e1c33958b227834c6253abfc0cb53bdb` — Merge remote-tracking branch 'origin/main' into feat/android-update
- `8c147cddc1b34d83900374e8325f15d01639f67b` — feat(android): update android project files and add demo guide documentation

### Main-side commits after merge base

- `81f82e246198f1b813492893d7e8f2486c83630e` — chore: archive remaining epoch docs and finish Markets-only cleanup
- `fa94e3d5f7498a642a42052500e04ca2110e0ed9` — Merge branch 'codex/p13c-002-transactional-signal-pipeline'
- `f8349d518b4fe425ec64663c5d4e9b9732ba2808` — chore(backend): make live Go module Markets-only
- `0a871567b4bc9107af78587f4597d0c837833ccf` — docs(markets-v1): record P13C-001 verification and resolve BLK-003
- `4ae48e393c3458c401e2cd41a84fb3d8d6312e19` — fix(markets): fail-closed catalog token registry for P13C-001

## Classification and disposition totals

| Classification | Count |
|---|---:|
| AGENT_HARNESS | 4 |
| ANDROID_GENERATED | 106 |
| ANDROID_SOURCE | 169 |
| BACKEND | 1 |
| DOCS | 73 |
| INTELLIGENCE_UI | 5 |
| MOCK_OR_FIXTURE_DATA | 2 |
| OPENAPI_CONTRACT | 1 |
| PRESENTATION_ONLY | 31 |
| SHARED_CLIENT | 7 |
| TRADING_BEHAVIOR | 16 |
| UNRELATED | 1 |
| WALLET_AUTH | 8 |
| WEB_APPLICATION_LOGIC | 78 |
| WORKSPACE_OR_LOCKFILE | 5 |

| Disposition | Count |
|---|---:|
| NEEDS_HUMAN_DECISION | 1 |
| PORT | 31 |
| QUARANTINE | 176 |
| REJECT | 194 |
| REWRITE_ON_MAIN | 105 |

## Architecture reconciliation findings

1. Actual current phase is **PHASE-2** (`implementation-manifest.yaml`); no phase is advanced by this evidence.
2. Current main is authoritative: web is `apps/web` and clients use the shared Go Markets BFF plus canonical `schemas/openapi/markets-v1.yaml`. Feature code with browser/mobile upstream calls, local duplicate models, floating-money parsing, direct submission/cancel, wallet/session persistence, or capability bypass is not adoptable as-is.
3. Feature paths under root `android/` are a duplicate Capacitor/static-export prototype, not the active Android gitlink. `apps/android` is unchanged across base, feature, and main at `a0c85537d409583a854ad3a237e36e0bf05314a4`. Main policy says implementation belongs in a future PHASE-5 Compose target (`apps/android-markets/`); generated `android/out/**` and duplicate prototype code are quarantined/rejected, never merged into the gitlink.
4. External canonical Android remote observed at `/opt/retropick-android`: `origin` is `git@github.com:RetroPick/RetroPick-Android.git`; checked-out HEAD `e962490dab3ac1072d9ee6371eb1077c0a05c0ac`, `origin/main` `0aed82d77c17c66d5ab47fa16cd4079f36a9aa67`, but the checkout is dirty and behind, so no source or sync action is justified by this task.
5. Main-side architectural changes include Markets-only backend/legacy archival and current Markets web documentation; feature paths must be reconciled against those decisions rather than merged by ancestry.

## Targeted risk scan

134 of 507 paths contained one or more targeted pattern hits. These are review signals, not proof of executable behavior; the per-path matrix retains each signal. The scan covered direct CLOB/Gamma/WS and Polymarket calls, duplicate models/custom identifiers, floating-money tokens, raw-key terms, eligibility/capability bypasses, submit/cancel, fake intelligence/metrics, auto-copy, and browser storage.

| Targeted signal | Paths flagged |
|---|---:|
| auto-copy | 32 |
| browser storage | 11 |
| custom identifier | 15 |
| direct browser/mobile Polymarket fetch | 2 |
| direct submit/cancel | 10 |
| direct upstream CLOB/Gamma/WS | 13 |
| duplicated API model | 35 |
| eligibility/capability bypass | 31 |
| fake intelligence/metrics | 4 |
| floating money | 39 |
| raw-key custody | 1 |

Direct upstream endpoint hits include `packages/polymarket/src/client.ts`, `apps/web/src/products/markets/lib/polymarketService.ts`, `android/lib/polymarket-service.ts`, and `android/lib/realtime-client.ts`; all are marked in the matrix for rejection or rewrite behind the BFF. The root Android prototype additionally contains direct submit/cancel, floating-money, paper-copy/auto-copy tokens, and generated-output copies; no part is approved for direct adoption.

## Android source-of-truth decision

**Decision:** `apps/android` gitlink plus the separate `RetroPick/RetroPick-Android` repository remain the only Android source-of-truth candidates. Root `android/` is an unapproved duplicate prototype/static export and is not a source for the planned Compose Markets client. Any Android adoption requires a PHASE-5 owned task, clean upstream verification, OpenAPI/BFF-only networking, and an explicit gitlink SHA validation; this R0 task makes no Android change.

## Evidence files

- `reconciliation-inventory.json` — machine-readable 507-path inventory.
- `frontend-android-reconciliation-matrix.md` — all paths, local provenance, classifications, and dispositions.
- `reconciliation-report.md` — this report.
