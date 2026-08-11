# MKT-P3-002 — CLOB V2 order submit — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-002  
**Approval:** User approved plan in chat (2026-08-09); `current_phase` **not** advanced.

## Summary

Implemented Polymarket CLOB V2 authenticated `POST /order` client in `apps/backend/internal/markets/clob/`: L2 HMAC auth, wire body mapping (preview int side → wire BUY/SELL), 15s timeout with `ErrSubmitUnknown` (no auto-resubmit), error taxonomy, and httptest/sandbox coverage. Updated registry §6.6.1. BFF HTTP submit (409/410/idempotency/kill-switch) deferred to glue chat per scope.

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/backend && go test ./internal/markets/clob/... -count=1` | Pass |
| `cd apps/backend && go test ./internal/markets/... -count=1` | Pass except pre-existing `TestMarketsOpenAPIContainsPhaseOneReadContract` (OpenAPI `info.version` 1.3.0 vs test expects 1.2.0 — outside MKT-P3-002 owned paths) |
| `cd apps/backend && go build -o /dev/null ./cmd/markets-api/` | Pass |

## Acceptance criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | CLOB V2 only | `orderSubmitPath = "/order"`; `TestNoV1OrderPaths`; registry §6.6.1 |
| 2 | Timeout → unknown, no resubmit | `TestSubmitOrderTimeoutUnknown`; `ErrSubmitUnknown`; registry §6.12 |
| 3 | Builder server-side on wire order | `order.builder` from preview payload; no `POLY_BUILDER_*` headers |
| 4 | L2 POLY_* headers on submit | `TestSubmitOrderHappyPath`, `TestSubmitOrderL2SignatureIncludesBody` |
| 5 | Sandbox default (no live creds) | `SandboxCredentials()` + httptest only |
| 6 | BLK-004 / human gate respected | No mainnet success claimed; BLK-004 remains open |
| 7 | Markets suite green | `./internal/markets/clob/...` and all subpackages pass; root `markets` package has pre-existing OpenAPI version drift (not introduced by MKT-P3-002) |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/clob/l2_auth.go` | L2 HMAC signature + headers |
| `apps/backend/internal/markets/clob/credentials.go` | L2 credential providers (sandbox/static/unwired) |
| `apps/backend/internal/markets/clob/submit_types.go` | Submit request/result + wire types |
| `apps/backend/internal/markets/clob/wire.go` | `BuildSendOrderBody`, side mapping |
| `apps/backend/internal/markets/clob/trading_client.go` | `TradingClient` constructor |
| `apps/backend/internal/markets/clob/submit.go` | `SubmitOrder` POST /order |
| `apps/backend/internal/markets/clob/*_test.go` | httptest suite + glue vector cross-test |
| `.dev/markets-v1/polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md` | §6.6.1 MKT-P3-002 wire contract |

## Blockers and gates

- **BLK-004:** CLOB integration — client layer implemented; blocker **remains open** until live integration + ops sign-off.
- **Human approval gate:** Real on-chain transaction (MKT-P3-002) — **not cleared**; no fabricated mainnet/testnet submit success.

## Glue chat handoff

1. `POST /markets/orders/submit` in `orders/submit.go` + OpenAPI
2. Load preview from `PreviewStore` by `previewId`
3. `VerifyContentHash` → **409**; expired → **410**
4. Gate on `capabilities.features.order_submit` (still **false**)
5. `Idempotency-Key` store (24h)
6. Wire `clob.NewTradingClient` + shared L2 credential store
7. Map `ErrSubmitUnknown` → `unknown_reconciling` for MKT-P3-005 reconcile

## Explicit non-claims

- No mainnet order acceptance
- No BLK-004 clearance
- No `current_phase` advance
