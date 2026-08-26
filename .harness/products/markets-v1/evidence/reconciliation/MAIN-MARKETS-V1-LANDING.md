# RetroPick Markets V1 — Main Landing Evidence

Status: post-purge landing evidence for the PHASE-2 development baseline.

This artifact records the purge merge and its verification base. It intentionally does **not** embed the SHA of the commit that contains this file as `FINAL_MAIN_SHA`, because doing so would be self-referential. The terminal `FINAL_MAIN_SHA` is recorded in durable PR/release metadata after this evidence-only PR is merged.

## Canonical architecture

```text
Polymarket upstream
        ↓
Go Markets BFF (apps/backend)
        ↓
canonical OpenAPI / AsyncAPI
      ↙                 ↘
 apps/web          apps/android
```

Canonical Markets semantics are mediated by the Go BFF. The cleanup does not start PHASE-3.

## Provenance and checkpoint chain

```text
PRE_CLEANUP_MAIN_SHA=81f82e246198f1b813492893d7e8f2486c83630e
PR12_SQUASH_SHA=c66ef8105dce567e297ff2bbb288698c10e3df89
PR13_MAIN_SHA=76b81fc58c717c4e5489b4fd6969f38a67d7a664
SYNC_MERGE_SHA=eb0220dc66acd1009ca3dbb6cef309f63ce50bd5
R0_FINAL_SHA=0d5c65517294edb802253fa5528a5d32f4c5a442
R1_SAFE_PURGE_SHA=ecc49fd085fd04f8b002a50d4205a368c6a8ec5c
R1_REWRITE_SHA=1ec7e768735179e2b19caadc0f3b9e23bd1012cf
R1_LEGAL_SHA=aeab89e9b6cf5eccd4dfe6a0ccce3caf5c0d293f
R1_CI_CLEANUP_SHA=49aa288a71b4599def985d10619fcd2c13244786
R1_FINAL_PURGE_SHA=b267865d405e11f9d2db7583faa14b74fd3b8654
DOC_COHERENCE_SHA=f83effca19b9329c533bebe700609322591ab1a5
FINAL_CANDIDATE_SHA=b7e300d39837c49e59dd48db0bf9d062787d3782
FINAL_PR=14
FINAL_PURGE_HEAD_SHA=b7e300d39837c49e59dd48db0bf9d062787d3782
PURGE_MERGE_SHA=954c014e4ad8c53f6a7780ff51f9f60c01f124ff
EVIDENCE_BASE_SHA=954c014e4ad8c53f6a7780ff51f9f60c01f124ff
ANDROID_SHA=5827aa536fab9cf266f8a758f8a6811bec175751
CURRENT_PHASE=PHASE-2
```

The final purge merge is a real two-parent merge commit:

- parent 1: `76b81fc58c717c4e5489b4fd6969f38a67d7a664`
- parent 2: `b7e300d39837c49e59dd48db0bf9d062787d3782`
- tree: `e5f5f0863197a17f66d2bac6ca8f5275c5a6ec93`

No squash, rebase, force-push, fake legacy compatibility check, or direct ref replacement was used for the final purge landing.

## Ancestry proof

Final purge main `954c014e4ad8c53f6a7780ff51f9f60c01f124ff` preserves both required historical lineages:

- `d58ac4db77daf2c98c5b04c4dcbeccbbe5715d3d` is an ancestor; compare result `ahead`, `behind_by=0`, merge-base equals `d58ac4d...`.
- `fff54010b32388e584959163fb02de775968eb02` is an ancestor; compare result `ahead`, `behind_by=0`, merge-base equals `fff54010...`.

This restores the reconciliation provenance that was flattened by the earlier squash landing.

## Repository closure

Post-merge verification on `main` proved:

- `archive/**` is absent.
- duplicate root `android/**` is absent.
- canonical `apps/android` remains a submodule at `5827aa536fab9cf266f8a758f8a6811bec175751`.
- `.harness/products/markets-v1/evidence/reconciliation/MARKETS-V1-LEGACY-PURGE-INVENTORY.json` is absent.
- retired Epoch / MarketEngine / custom exchange runtime is not active.
- retired indexer / keeper / settlement / protocol implementation is not active.
- retired Foundry workflow and `migration-v3` workflow are removed from the current workflow topology.
- old fe-v1/docs applications are not active workspace applications.
- orphaned Graphify generated/checker state is removed.
- retained current documentation is guarded by the Markets documentation-coherence check.

## CI and fresh-main qualification

### Exact candidate

GitHub Actions run #114 (`33022676353`) on exact candidate `b7e300d39837c49e59dd48db0bf9d062787d3782` completed successfully.

Required jobs:

```text
ci=PASS
migration-markets=PASS
sqlc-drift=PASS
```

The `ci` job passed:

- `pnpm install --frozen-lockfile`
- lint
- typecheck
- Markets unit tests
- Playwright Markets E2E: 10/10
- OpenAPI drift
- AsyncAPI drift
- active legacy boundary scan
- retained documentation coherence
- legal digest preservation
- `pnpm build`
- Go build
- targeted Markets OpenAPI/runtime conformance
- full `go test ./...`

### Fresh main

GitHub Actions push run #115 (`33023249388`) on purge merge SHA `954c014e4ad8c53f6a7780ff51f9f60c01f124ff` also completed successfully.

```text
ci=PASS
migration-markets=PASS
sqlc-drift=PASS
```

This is the post-merge clean-main qualification and does not rely only on the long-lived cleanup worktree.

## Branch protection

After landing, `main` remains protected and requires only the canonical GitHub Actions checks:

```text
ci
migration-markets
sqlc-drift
```

Retired required contexts are absent:

```text
migration-v3
foundry
```

## Vercel integration hygiene

All eight obsolete `monorepo-base-fe-v1*` / `monorepo-base-docs*` projects were disconnected from `RetroPick/monorepo-base` before the final landing.

Canonical project:

```text
project=web
project_id=prj_9hpZEv6bNPeNL3XfozjlZg45ywzl
repository=RetroPick/monorepo-base
root_directory=apps/web
```

Exact-candidate Git preview:

```text
deployment=dpl_DYVz4amBhL7U9PLzTKtTrU6SA9NW
sha=b7e300d39837c49e59dd48db0bf9d062787d3782
state=READY
source=git
```

The preview build ran from `apps/web`, included the legal API route in the Next.js serverless build, and the Terms legal API returned HTTP 200. Subsequent protected-preview fetches were subject to Vercel SSO, not application fallback redirects.

The merge to `main` automatically triggered Vercel deployment `dpl_HFEzmTAasJQWo7Myu8izZ238Lty9` for SHA `954c014e4ad8c53f6a7780ff51f9f60c01f124ff`, which reached `READY`. No manual production deploy or promote action was performed by the cleanup operator.

## Legal preservation status

```text
LEGAL_CONTENT_REVIEW=NOT_PERFORMED
LEGAL_RELOCATION=APPROVED
CONTENT_MUTATION=NONE
DIGEST_PRESERVATION=PASS
```

Canonical legal document hashes remain:

```text
Terms SHA-256:
c8fd7427d81c4d0ffa1f6ee0c8a0a879eed2dea82a7da4a670f343bd9cec3b44

Privacy SHA-256:
4f9307d96d4a04d20fc58ad8fd3867281bf3a39ec280ffb99d823df11dedf818
```

This is repository relocation/preservation evidence, not substantive production legal approval.

## QA / security classification

The final release checkpoint `b7e300d3...` has the same tree as previously reviewed `b3d08ab1...`; the compare contains zero changed files. The exact final checkpoint was then requalified by canonical CI and Vercel preview.

No cleanup-introduced or cleanup-worsened merge-blocking High/Critical finding was identified in the cleanup delta. This statement is not a general production security certification; pre-existing later-phase security/product debt remains tracked by the Markets program.

## Remaining program blockers

The implementation manifest remains `current_phase: PHASE-2`.

Current PHASE-2 blockers include:

- `BLK-001` — GeoIP/geoblock staging proof pending.
- `BLK-005` — deterministic funding lifecycle / relayer sandbox work pending.

Later-phase or production blockers remain tracked separately, including live trading credentials/staging proof, contract-address revalidation, upstream CLOB assumptions, per-region substantive legal review, production credentials, and Play Store financial-feature declarations.

No item in this evidence addendum authorizes PHASE-3 work, real on-chain transactions, production wallet creation, destructive migrations, or other human-gated production actions.

## Landing conclusion

At `EVIDENCE_BASE_SHA=954c014e4ad8c53f6a7780ff51f9f60c01f124ff`:

```text
MARKETS_V1_PURGE_LANDED=PASS
DEVELOPMENT_BASELINE_QUALIFICATION=PASS
CURRENT_PHASE=PHASE-2
```

The terminal `FINAL_MAIN_SHA` after this evidence-only addendum lands is deliberately stored outside this file in durable PR metadata.
