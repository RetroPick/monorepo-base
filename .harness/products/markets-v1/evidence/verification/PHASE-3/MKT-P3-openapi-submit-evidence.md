# MKT-P3 OpenAPI — submit / cancel / list — Evidence

**Date:** 2026-08-09  
**Agent:** Chat OA  
**Task:** PHASE-3 OpenAPI spec freeze (submit, cancel, list orders/fills)  
**Approval:** User approved plan in chat (2026-08-09); `current_phase` remains **PHASE-2** (not advanced).

## Summary

OpenAPI **v1.3.0** freeze for PHASE-3 order submit, cancel-preview, cancel, and list (orders + fills). Contract doc §3.4 added with hash binding handoff from MKT-P3-001. No CLOB client, handlers, web, migrations, or mainnet claims.

## Verification commands

| Command | Result |
|---------|--------|
| `/usr/local/go/bin/go test ./internal/markets/... -run TestOpenAPIRuntimeConformancePhaseOne -count=1` (from `apps/backend`) | **Pass** |
| `rg -n 'type: number\|format: float\|format: double' schemas/openapi/markets-v1.yaml` | **Pass** — no matches |
| `graphify update .` | Run after YAML edit |

## OpenAPI paths added (all `x-phase: 3`, `MarketsSession`)

| Method | Path | operationId | Idempotency-Key |
|--------|------|-------------|-----------------|
| `POST` | `/markets/orders/submit` | `submitOrder` | required |
| `POST` | `/markets/orders/{orderId}/cancel-preview` | `previewCancelOrder` | — |
| `POST` | `/markets/orders/{orderId}/cancel` | `cancelOrder` | required |
| `GET` | `/markets/me/orders` | `listMyOrders` | — |
| `GET` | `/markets/me/fills` | `listMyFills` | — |

Existing frozen path unchanged: `POST /markets/orders/preview` (v1.2.0).

## Schemas added

| Schema | Purpose |
|--------|---------|
| `OrderStatus` | Domain order states |
| `OrderListStatusFilter` | Query filter including `open` sentinel |
| `OrderSubmitRequest` / `OrderSubmitResponse` | Submit wire |
| `OrderCancelPreviewResponse` / `OrderCancelRequest` / `OrderCancelResponse` | Cancel wire |
| `OrderCancelHumanSummary` / `UnsignedCancelPayload` | Cancel preview binding |
| `UserOrder` / `OrdersListResponse` | List orders |
| `UserFill` / `FillsListResponse` | List fills |

Parameters: `OrderID`, `OrderIDQuery`, `OrderListStatus`.

## Capabilities

- `CapabilitiesResponse.features.order_submit` documented explicitly (required boolean).
- Example on `GET /markets/capabilities` shows `order_submit: false`.
- Runtime remains `false` in `service.go` until MKT-P3-002 wiring.

## Hash binding rules (MKT-P3-001 handoff)

1. Submit accepts `previewId`, `contentHash`, `signature` + `Idempotency-Key`.
2. Server loads preview by `previewId`; recomputes hash over canonical JSON `{ unsignedPayload, metadata: { chainId, marketId, tokenId } }` → SHA-256 → `0x` + 64 hex.
3. Mismatch → HTTP 409 `integrity_mismatch` (no CLOB POST).
4. Preview TTL ≤ 5m → HTTP 410 `preview_expired`.
5. Single-use `previewId` consumed on successful submit.
6. Cancel uses same binding pattern via cancel-preview → cancel.

## Changed paths

| Path | Change |
|------|--------|
| `schemas/openapi/markets-v1.yaml` | v1.3.0 — 5 paths, 14 schemas, capabilities example |
| `.dev/markets-v1/backend/API_AND_REALTIME_CONTRACTS.md` | §3.4 orders semantics; §3.2 cleanup; §0 worked example fix |

## Explicit non-goals (confirmed)

- No `apps/backend/internal/markets/clob/` submit implementation
- No web/Android client changes
- No Postgres migrations
- No `current_phase` manifest advance
- No mainnet / CLOB POST handler mounted
- `openapi_contract_test.go` path/version assertions deferred to MKT-P3-002 glue

## Handoff

| Consumer | Next work |
|----------|-----------|
| **MKT-P3-002** | `submitOrder` handler, preview store consume, idempotency, integrity errors, CLOB ACL |
| **MKT-P3-003** | `cancelOrder`, `listMyOrders`, `listMyFills`, reconciliation projections |
| **MKT-P3-004** | Regenerate TS types; gate UI on `features.order_submit` |

## Sign-off

- [x] Five PHASE-3 paths with `x-phase: 3` and session security
- [x] Submit/cancel require `Idempotency-Key` where specified
- [x] Fixed-point money only (`DecimalString` / `MoneyAmount`)
- [x] `features.order_submit` documented with false example
- [x] Contract doc §3.4 hash binding + error codes
- [x] kin-openapi load/validate passes
- [x] No secrets in artifact
