# Verification Evidence — MKT-P2-007

## Task ID

MKT-P2-007 — PHASE-2 exit gate verification

## Date / agent

2026-08-09 / Chat S

## Environment

- Branch: `main`
- Commit: `591ad7137b68fd64dfbecbe2893aeabec6566b32` (local working tree includes glue test + auth test clock fix)

## Depends on (A+B+C)

| Task | Scope | Upstream evidence |
|------|-------|-------------------|
| MKT-P2-004 (A) | Deposit wallet / link / preview / relay | [MKT-P2-004-backend-evidence.md](./MKT-P2-004-backend-evidence.md), [MKT-P2-004-web-openapi-align-evidence.md](./MKT-P2-004-web-openapi-align-evidence.md) |
| MKT-P2-005 (B) | SIWE session auth | [MKT-P2-005-evidence.md](./MKT-P2-005-evidence.md), [MKT-P2-005-web-evidence.md](./MKT-P2-005-web-evidence.md) |
| MKT-P2-006 (C) | pUSD balance read + main wire | [MKT-P2-006-evidence.md](./MKT-P2-006-evidence.md), [MKT-P2-006-main-wire-evidence.md](./MKT-P2-006-main-wire-evidence.md) |

Additional upstream glue:

- [MKT-P2-GLUE-session-wallet-evidence.md](./MKT-P2-GLUE-session-wallet-evidence.md) — `/me/wallets` auth-only 200
- [MKT-P2-health-ready-fix-evidence.md](./MKT-P2-health-ready-fix-evidence.md) — health/ready typed-nil fix
- [MKT-P2-002-BLK001-evidence.md](./MKT-P2-002-BLK001-evidence.md) — BLK-001 honesty

## Commands executed

See [MKT-P2-007-test-output.txt](./MKT-P2-007-test-output.txt) for full stdout.

```bash
pnpm smoke:markets-stack
curl http://127.0.0.1:8080/api/v1/markets/capabilities  # order_submit
curl http://127.0.0.1:8080/api/v1/markets/eligibility   # eligible/reason
cd apps/backend && go test ./internal/markets/auth/... ./internal/markets/wallet/... ./internal/markets/balances/... ./internal/markets/eligibility/... -count=1
go test ./internal/markets/ -run 'TestCapabilities|TestReadiness|TestProductionEligibility|TestMetricsRecordEligibilityFailClosed' -count=1
go build ./cmd/markets-api ./cmd/api
cd apps/web && pnpm test:markets && pnpm typecheck
/home/asyam/dev/set-up/cli/harness doctor
git diff --check
# Invariant greps — see MKT-P2-007-invariant-greps.txt
graphify update .
```

## Exit proof matrix

| # | Claim | Pass/Fail | Notes |
|---|-------|-----------|-------|
| 1 | Stack discover 200 | **Pass** | Smoke: health live/ready, capabilities, events + seeded `polymarket:event:seed-multi`; glue `TestMeWallets_AuthenticatedEmptyWallets` → 200 |
| 2 | SIWE | **Pass** | `go test ./internal/markets/auth/...`; wallet/balances glue SIWE round-trip; web `marketsAuthClient.test.ts`, `useMarketsWalletSession.test.tsx` |
| 3 | Wallets/link paths | **Pass** | `go test ./internal/markets/wallet/...` (link, preview, relay); web `fundingApiClient.test.ts` |
| 4 | Funding sandbox | **Pass** | `FundingPage` sandbox banner; `createEnabled: false`; `fundingCustody.test.ts`; no relayer secrets in client |
| 5 | Balances auth + eligible | **Pass** | Handler tests 401/404/502; **new** glue: `TestMeBalances_Unauthenticated`, `TestMeBalances_AuthenticatedIneligible` (403), `TestMeBalances_AuthenticatedEligibleNoWallet` (404) |
| 6 | Health/ready no panic | **Pass** | Smoke ready HTTP 200; `TestReadinessTypedNilRealtimeRuntime` |
| 7 | No order submit | **Pass** | Live `order_submit=false`; no backend route; OpenAPI no submit paths; negative greps |
| 8 | BLK-001 ops-pending honest | **Pass** | Live `eligible=false reason=geo_unknown`; balances 403 under default evaluator; **BLK-001 stays open** |

## Code added this task

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/balances/glue_test.go` | Full-router `/me/balances` glue tests (401, 403, 404) |
| `apps/backend/internal/markets/auth/auth_test.go` | Fixed SIWE test clock drift (`time.Now().UTC()` vs hardcoded expiry) |

## Traceability

| Requirement | Test / artifact | Result |
|-------------|-----------------|--------|
| MKT-FR-020 | SIWE round-trip + wallet connect tests; custody greps | Pass |
| MKT-FR-021 | Default evaluator fail-closed; live eligibility `geo_unknown`; `TestMetricsRecordEligibilityFailClosed` | Pass |
| MKT-SEC-001 | No T4 storage in auth/wallet/funding; custody invariant tests | Pass |
| MKT-SEC-003 | SIWE session cookie binding; glue auth ↔ balances gates | Pass |

## Task-graph acceptance criteria

| Criterion | Result |
|-----------|--------|
| `eligibility_fail_closed` metric green | Pass — `TestMetricsRecordEligibilityFailClosed` |
| No order submit yet | Pass — capabilities + greps |

## Known debt / open blockers (non-blocking for this verification task)

- **BLK-001** — code complete; ops staging proof pending; `eligible:true` unreachable in default deploy
- **MKT-P2-002** — remains `blocked`; not cleared by this exit
- **BLK-005** — manifest title stale (“not implemented”); partial sandbox delivery vs production wallet gate
- **BLK-004** — CLOB submit PHASE-3
- L2 credentials unwired → balances **502** when eligible + linked (acceptable fail-closed)
- P2-005-web manual staging checklist unchecked
- fe-v1 global `Header` `WalletButton` (PHASE-1 debt)
- Auth test clock fix documents prior hardcoded-date expiry drift (fixed during exit run)

## Sign-off

- [x] Acceptance criteria met for MKT-P2-007 verification task
- [x] **Phase advance deferred** — `current_phase` unchanged; BLK-001 not cleared
- [x] No secrets in artifact
