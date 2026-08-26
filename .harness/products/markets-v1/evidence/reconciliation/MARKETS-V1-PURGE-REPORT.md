# Markets V1 Legacy Purge Report

Status: `PRE_FREEZE_QUALIFICATION`

This report records the current-tree Markets V1 cleanup state before `FINAL_CANDIDATE_SHA` freeze. It is not a production approval and does not authorize PHASE-3.

## Canonical runtime boundary

```text
Polymarket Gamma / CLOB / Data / WS
               ↓
       Go Markets BFF (apps/backend)
               ↓
 canonical OpenAPI / AsyncAPI
          ↙               ↘
      apps/web          Android
```

Clients must not bypass the Go Markets BFF.

## Repository purge closure

- Base main observed before this report: `76b81fc58c717c4e5489b4fd6969f38a67d7a664`.
- Purge/docs-normalization parent: `f83effca19b9329c533bebe700609322591ab1a5`.
- `archive/**`: absent from the current cleanup tree.
- duplicate root `android/**`: absent from the current cleanup tree.
- approved Android gitlink: `5827aa536fab9cf266f8a758f8a6811bec175751`.
- retired Foundry workflow/configuration: removed.
- temporary generated purge-inventory JSON: removed.
- mechanical `Current Markets V1 authority:` placeholders were removed from retained current Markdown; reconciliation evidence is intentionally excluded from the current-doc coherence rule.
- temporary one-shot normalization workflow removed itself after the normalization checkpoint.

Authoritative bulk-purge inventory before deletion classified 6,106 `archive/**` entries and 150 duplicate root `android/**` entries as `DELETE_LEGACY`. The final PR diff remains the source of truth for the complete landed deletion set.

## Legal relocation and deployment packaging

Canonical content remains at:

- `docs/markets-v1/legal/TERMS_OF_SERVICE.md`
- `docs/markets-v1/legal/PRIVACY_POLICY.md`

Legal API/browser surfaces:

- `/api/markets/legal/terms`
- `/api/markets/legal/privacy`
- `/markets/terms`
- `/markets/privacy`

Next.js 14 output-file tracing explicitly includes the canonical legal Markdown from the monorepo root. Legal content was not duplicated to satisfy bundling.

Expected response/content SHA-256 values:

- Terms: `c8fd7427d81c4d0ffa1f6ee0c8a0a879eed2dea82a7da4a670f343bd9cec3b44`
- Privacy: `4f9307d96d4a04d20fc58ad8fd3867281bf3a39ec280ffb99d823df11dedf818`

Legal status semantics are preserved exactly:

- `LEGAL_CONTENT_REVIEW=NOT_PERFORMED`
- `LEGAL_RELOCATION=APPROVED`
- `CONTENT_MUTATION=NONE`
- `DIGEST_PRESERVATION=PASS`

Substantive production legal review remains outstanding PHASE-2 debt. Development-ready must not be represented as production legal approval.

## CI evidence before final freeze

GitHub Actions has emitted the canonical job contexts:

- `ci`
- `migration-markets`
- `sqlc-drift`

Diagnostic qualification before the documentation normalization checkpoint proved:

- frozen pnpm install: PASS
- lint: PASS
- typecheck: PASS
- Playwright browser installation: PASS
- `pnpm test`: PASS
- Markets Playwright suite: 10/10 PASS
- Markets test suite observed in CI: 116 tests PASS
- OpenAPI drift: PASS
- AsyncAPI drift: PASS
- active-legacy boundary scan: PASS
- `migration-markets`: PASS after correcting an invalid test fixture without changing production registry semantics
- `sqlc-drift`: PASS after aligning CI to the repository generator version (`sqlc v1.31.1`)

Those results are diagnostic only because the PR head subsequently changed. A clean canonical run on the eventual exact `FINAL_CANDIDATE_SHA` is still mandatory.

## Remaining pre-merge gates

The cleanup is not merge-authorized until all of the following are true on one exact immutable candidate:

1. current-document coherence gate passes;
2. full canonical `ci`, `migration-markets`, and `sqlc-drift` pass;
3. clean isolated/fresh-environment qualification passes, including actual Playwright execution;
4. canonical Vercel `apps/web` preview is tied to the exact candidate and proves both legal APIs return HTTP 200 with the expected response-body hashes and both browser legal routes render without fallback;
5. obsolete `monorepo-base-fe-v1*` and `monorepo-base-docs*` Vercel Git integrations no longer attach stale statuses;
6. branch protection requires the actual canonical contexts (`ci`, `migration-markets`, `sqlc-drift`) rather than retired `migration-v3` / `foundry` contexts, with all other protection semantics preserved;
7. independent QA approves the exact candidate;
8. independent security review reports no cleanup-introduced/materially-worsened merge-blocking High or Critical finding;
9. pre-existing PHASE-2 security/product debt remains truthfully recorded rather than falsely marked fixed;
10. `FINAL_CANDIDATE_SHA` and `BASE_MAIN_SHA` are frozen and reverified immediately before merge;
11. PR head equals `FINAL_CANDIDATE_SHA`, `origin/main` equals `BASE_MAIN_SHA`, Android remains the approved SHA, phase remains `PHASE-2`, and the qualifying worktree/environment is clean.

If `main` advances after candidate freeze, the stale candidate must not merge. Merge latest `origin/main` into the same cleanup branch with a merge commit, invalidate candidate-specific approvals, and fully requalify. Never rebase or force-push for base drift.

## Security classification rule

Final security review must classify findings as:

- **A — cleanup-introduced or materially worsened**, or
- **B — pre-existing PHASE-2 security/product debt**.

Any new/increased High or Critical finding is merge-blocking. Pre-existing later-phase debt does not by itself expand this cleanup into PHASE-3 unless it makes the development baseline itself unsafe or invalid.

## Phase

`current_phase=PHASE-2`

No PHASE-3 implementation is authorized by this report.
