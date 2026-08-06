# Markets V1 Phase 1 Reconciliation Report

**Date:** 2026-07-30
**Starting HEAD:** `bf269210772b07764ac02a60eff1ca91deae6d4f`
**Authorized slice:** backend foundation and public read markets
**Result:** `PASS_WITH_FOCUSED_ADR`
**Decision:** [ADR-010](../architecture/adr/ADR-010-PHASE-1-BACKEND-FIRST-SLICE.md)

## Repository-to-design matrix

| Area | Approved design | Repository evidence | Status | Action |
|---|---|---|---|---|
| monorepo/workspaces | Reuse Go BFF and existing workspace | `apps/backend`, root pnpm workspace | aligned | Reuse |
| backend language | Go modular monolith | `apps/backend/go.mod`, `cmd/api`, `internal/*` | aligned | Extend `internal/markets` |
| database/migrations | PostgreSQL, golang-migrate, sqlc | `migrations/`, `sqlc.yaml`, `internal/dbqueries` | aligned | Add migration 000016 and Markets queries |
| OpenAPI/schema ownership | Shared Markets V1 contract | `schemas/openapi/markets-v1.yaml` is a partial stub | missing | Expand contract before handlers |
| Polymarket adapter | BFF anti-corruption layer | `internal/markets/gamma` lists minimal events | partial | Harden Gamma and add public CLOB client |
| realtime pipeline | Snapshot plus gap recovery | Existing ADR implies sequence; upstream exposes hash/time, not sequence | conflict | Resolve with ADR-010 snapshot/hash resync |
| observability | Freshness and upstream result metrics | Generic health and legacy metrics exist | partial | Add Markets metrics/readiness data |
| CI/CD | Existing Go, migration, and sqlc drift gates | `.github/workflows/ci.yml` | aligned | Extend existing gates |
| Phase 1 tasks | Backend-first read slice | Harness includes web/Android and omits several backend tasks | conflict | Realign task graph for this run |

## Code-to-harness drift

- The manifest recorded every task as `planned`, but event listing, capability,
  eligibility, and a minimal Gamma client already existed.
- `Service.Capabilities` referenced a missing response field, so the pre-existing
  Markets package did not compile.
- No Markets persistence, detail routes, CLOB market data, realtime state,
  signal engine, or conformance evidence existed.
- The canonical OpenAPI described only three partial endpoints.

## Official upstream verification

Facts were retrieved from official Polymarket documentation on 2026-07-30.

| Fact | Evidence | Confidence | Revalidation trigger |
|---|---|---|---|
| Gamma is the event/market metadata surface | `/getting-started/api`; event and market API references | high | Gamma schema/changelog change |
| CLOB `/book` and `/prices-history` are public read surfaces | prices/order-books and rate-limit docs | high | CLOB V2 migration or endpoint change |
| Public realtime uses the market WebSocket and token IDs | WSS market API reference | high | WebSocket schema change |
| Book and delta payloads expose hash/time, not a documented monotonic sequence | WSS market API reference | high | sequence field becomes documented |
| Gamma and CLOB apply documented IP-based throttling | rate-limit reference | high | rate-limit page change |
| No unified official Go SDK is documented | official SDK listings; direct API guidance | medium | official Go SDK release |
| Eligibility/geoblock is not required for public reads and remains fail-closed for transactions | current phase boundary | medium | Phase 2 authorization |

No contract address, collateral address, signing domain, credential, or
transactional assumption is needed by this public-read slice.

## Focused deviations

1. Web and Android implementation are deferred by the uploaded assignment.
2. The task graph's web-rendering exit criterion is replaced by backend contract
   conformance and deterministic fixture evidence.
3. Realtime recovery uses snapshot hash, timestamps, bounded age, and forced
   resnapshot because upstream does not document a monotonic sequence.
4. Existing Go/PostgreSQL architecture is retained; no SDK, datastore,
   microservice platform, Kafka, or Kubernetes dependency is introduced.

## Gate

The slice may proceed because the conflicts are local, reversible, and resolved
by ADR-010. Human approval remains required for production deployment,
production writes, secrets, custody/signing, fund movement, destructive
migration, custom contracts, and jurisdiction enablement.

---

# Phase 1.3 Runtime Reconciliation (P13C-000)

**Date:** 2026-08-06
**Worktree:** `/home/asyam/dev/set-up/projects/retropick-markets-v1`
**Branch:** `codex/p13c-000-reconciliation`
**Authoritative baseline:** PR #9 merge commit `54ae0f9fd98ada0c2ec646deea65b973fce885ca` on `origin/main`
**Result:** `RECONCILIATION_ACCEPTED` — documentation and local verification complete (2026-08-06)
**Agent:** Cursor (Composer)

## Worktree and parent checkout integrity

| Check | Result |
|---|---|
| `origin/main` resolves to `54ae0f9…` | PASS |
| Sibling worktree clean at creation | PASS |
| Parent porcelain unchanged (130 lines, diff empty) | PASS |
| Parent branch remains `production/testnet-hardening-v1` (untouched) | PASS |

## Toolchain reconciliation evidence

| Source | Declared Go | Declared Node | Notes |
|---|---|---|---|
| `apps/backend/go.mod` | **1.25** | — | Authoritative module requirement |
| `.github/workflows/ci.yml` | **1.26** | **22** | CI uses newer Go than module pin |
| Local environment | **1.26.5** (`/home/asyam/toolchain/go1.26.5`) | **v22.22.0** (nvm) | Verification toolchain; not committed to repo |

**Verdict:** No `toolchain` directive in `go.mod`. Module minimum `go 1.25`; CI and local verification use Go 1.26.5 with `GOTOOLCHAIN=local`. Not a defect.

## ECC preflight (existing install only)

| Command | Result | Notes |
|---|---|---|
| `ecc doctor` | PASS | No install-state files for current context |
| `ecc list-installed` | PASS | Inventory empty; `ecc-universal@2.1.0` global |
| `ecc memory doctor` | PASS | 0 memories, 0 invalid files |
| `ecc security-ioc-scan` | PASS | 11 files, zero findings |
| AgentShield | **unavailable** | Not installed; not claimed as executed |

## PR #9 code vs harness documentation gap matrix

| Area | Pre-reconciliation docs | PR #9 code evidence | Honest status | Closure owner |
|---|---|---|---|---|
| Catalog token registry | BLK-003: TokenRegistryMap | `CatalogTokenRegistry` in `main.go`; no `TokenRegistryMap` in tree | implemented — validation pending | P13C-001 |
| Live signal pipeline | BLK-004: producer missing | `LiveSignalCommitter`, `SignalPipeline` wired | implemented — validation pending | P13C-002 |
| E2E upstream→hub | P13C-003 pending | `realtime/e2e_test.go` present | present — not verified locally | P13C-003 |
| Capability honesty | P13C-004 pending | `MARKETS_REALTIME_ENABLED` defaults `0` | default safe — validation pending | P13C-004 |
| Single-replica guard | BLK-006 | No leader election | not implemented | P13C-006 |
| Credential rotation | BLK-005 | `ROTATION_PENDING_OWNER` | blocked — owner action | P13C-007 |
| Baseline reference | PR #8 / `64bce05` | PR #9 / `54ae0f9` | stale — corrected | P13C-000 |
| ADR-014 | design only until P13C-002 | wiring in PR #9 | remain design-only until P13C-002 | P13C-002 |

## MKT-P13 honest status

| Task | Status | Rationale |
|---|---|---|
| MKT-P13-000 | done | ADR-011…014 accepted (design) |
| MKT-P13-001 | done | Upstream WS supervisor |
| MKT-P13-002 | done | Snapshot-first reconciler |
| MKT-P13-003 | done | Delivery metadata |
| MKT-P13-004 | partial | Schema + committer landed; P13C-002 pending |
| MKT-P13-005 | partial | Runtime wiring landed; P13C-001/003/004/005 pending |

## MKT-P1-008 vs Phase 1.3 live pipeline

| Path | Scope | Status |
|---|---|---|
| MKT-P1-008 (Phase 1) | Catalog-sync signals in ApplyPage transaction | done (P1C-008) |
| Phase 1.3 live | price_move / liquidity_change via observations | wired in PR #9; ADR-014 NOT implemented until P13C-002 |

## Local verification (sanitized)

**Passed (Node 22.22.0):** `pnpm --filter @retropick/markets-v1 test` (75), `pnpm --filter @retropick/polymarket test` (20), OpenAPI drift PASS, AsyncAPI drift PASS.

**Passed (Go 1.26.5, `GOTOOLCHAIN=local`, `-mod=readonly`):**
- `go -C apps/backend test ./internal/markets/... -count=1` → exit 0 (11 packages)
- `go -C apps/backend test ./... -count=1` → exit 0 (no Markets regression)
- `go -C apps/backend vet ./internal/markets/...` → exit 0
- No `go.mod`/`go.sum` mutation after Go commands

## P13C-000 acceptance verdict

| Criterion | Result |
|---|---|
| MKT-P13 honest statuses | PASS |
| ADR-014 not implemented | PASS |
| Phase 1.3 not complete | PASS |
| Full Phase 1.3 unit tests green | FAIL/BLOCKED |
| Gap matrix documented | PASS |

**Overall: ACCEPTED** — pending independent human review before P13C-001 handoff.
