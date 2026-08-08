# API AND REALTIME CONTRACTS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## Description

This document is the semantics overlay for the Markets V1 **HTTP and realtime surface** shared by web and Android. It inventories operations (eligibility, capabilities, catalog, me/*, funding, orders, intelligence, alerts, …), shared components (`Money`, `DecimalString`, `ErrorResponse`, `Idempotency-Key`, `x-phase`), WS channels, error envelope, idempotency store, `/api/v1` versioning, and timeout budgets—without inventing paths. Canonical schemas live in `schemas/openapi/markets-v1.yaml`.

It sits in Wave 3 beside auth/eligibility and architecture. Mutating POSTs require `Idempotency-Key` with 24h replay; phase gates keep unfinished surfaces dark via capabilities. Realtime is a projection stream (`market.*.book|trades`, `user.orders|fills|positions`, `alerts.inbox`) with resume via `Last-Event-ID`—never invent fills the venue did not produce. Clients retry catalog with backoff; never auto-retry preview/submit.

Read this before implementing or calling any Markets endpoint or channel, or when writing contract tests. Prefer the OpenAPI YAML for shapes and sibling auth/domain docs for gates and state machines—not for ad-hoc new routes.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | `be-api` / `be-realtime` implementing `cmd/api` and WebSocket hub; web and Android client authors; contract-test owners of `internal/markets/contract_test.go`; agents adding operations only when present in OpenAPI. |
| **What** | Semantics overlay for the Markets HTTP + realtime surface: operation inventory (eligibility, capabilities, catalog, me/*, account-wallet/approvals preview+relay, funding quote/track, withdrawals, orders preview/submit/cancel, position ops, watchlists, intelligence, alerts, journal, execution-quality), shared components (`Money`, `DecimalString`, `ErrorResponse`, `Idempotency-Key`, `x-phase`), WS channels (`market.<id>.book|trades`, `user.orders|fills|positions`, `alerts.inbox`), error envelope, idempotency store, `/api/v1` versioning, timeout budgets. **Canonical schemas live in YAML—this doc does not invent paths.** |
| **When** | Before implementing or calling any Markets endpoint or channel. Phase gates (`x-phase`) decide which ops are live. Mutating POSTs always carry idempotency from day one of that op. Breaking shape changes require v2 + parallel run; feature discovery via `GET /markets/capabilities`. |
| **Where** | Authority: [schemas/openapi/markets-v1.yaml](../../../schemas/openapi/markets-v1.yaml). This file: auth/realtime/timeouts/idempotency semantics. Handlers under `apps/backend/internal/markets/handler*`. Idempotency persistence: `markets.idempotency_keys` (or Redis with PG backing). WS protocol: JSON `{type, sequence, payload, emittedAt}`, resume `Last-Event-ID`, heartbeat 30s. Auth/eligibility gates: [AUTH_SESSION_AND_ELIGIBILITY.md](./AUTH_SESSION_AND_ELIGIBILITY.md). |
| **Why** | Web and Android must share one contract so BFF projections stay consistent. Fixed-point `Money` and string decimals prevent float bugs in clients. Idempotency stops double funding/order submits. Phase extensions keep unfinished surfaces dark. Realtime is a projection stream—reconnect/resume must not invent fills the venue never produced. |
| **How** | Implement only listed `operationId`s; generate/validate against OpenAPI examples. Public GETs for catalog/book; auth for `me/*`, trading, funding, alerts. On POST: require `Idempotency-Key`, store response 24h, replay identical body. Errors: `{ error: { code, message, details, requestId } }` (e.g. `ELIGIBILITY_DENIED`). Respect timeout classes (catalog 5s, preview 10s, submit 15s, relay 30s)—clients retry catalog with backoff, never auto-retry preview/submit. WS: optional auth for public market channels; required for user.* and alerts.inbox. |

### Worked example

**Happy path — preview then submit.** Client reads `GET /markets/capabilities` and `GET /markets/eligibility`, loads `GET /markets/markets/{marketId}/orderbook`, then `POST /markets/orders/preview` (auth + `Idempotency-Key`) receiving EIP-712 payload with `Money` / `DecimalString`. After wallet signature, `POST /markets/orders/submit` returns order id; client subscribes to `user.orders` / `user.fills` and reconciles with `GET /markets/me/orders`. Contract tests load YAML `examples` and assert handler JSON.

**Happy path — funding track + realtime inbox.** `POST /markets/funding/quote` then `track` (Phase 2, auth). On credit, notification path may push inbox; WS `alerts.inbox` delivers `{type, sequence, payload, emittedAt}` with 30s heartbeats. Resume uses `Last-Event-ID`.

**Failure / degraded.** Duplicate submit same idempotency key → same response, no second venue post (24h store in `markets.idempotency_keys` or Redis+PG). Eligibility fail → `ELIGIBILITY_DENIED` without geo PII. CLOB timeout → `unknown`; client polls, does not blind-resubmit. WS disconnect → resume; gaps healed via REST projections. Phase-gated op early → capability false / not mounted. **Never invent paths** outside the OpenAPI inventory.

### Shared components (authoritative in YAML)

- `Money` — base units + currency + decimals (no float)
- `DecimalString` — price/probability as string
- `ErrorResponse` — `{ error: { code, message, details, requestId } }`
- `Idempotency-Key` — required on mutating POST
- `x-phase` — rollout gate per operation

### Realtime channels

| Channel | Auth | Payload |
|---------|------|---------|
| `market.<id>.book` | optional | snapshot + delta |
| `market.<id>.trades` | optional | trade tick |
| `user.orders` | required | order status |
| `user.fills` | required | fill event |
| `user.positions` | required | position update |
| `alerts.inbox` | required | alert notification |

### Timeout budget

| Class | Server | Client |
|-------|--------|--------|
| Catalog GET | 5s | Retry with backoff |
| Preview POST | 10s | No auto-retry |
| Submit POST | 15s | Poll order status |
| Relay POST | 30s | Show pending |

### Implementer checklist

- Implement only listed `operationId`s from OpenAPI.
- Versioning: `/api/v1`; breaking → v2 + parallel run.
- Fixtures: `apps/backend/internal/markets/contract_test.go`.
- WS is a projection stream—never invent fills the venue did not produce.

## 1. Purpose

HTTP and realtime contracts shared by web and Android. Canonical source:
**[schemas/openapi/markets-v1.yaml](../../../schemas/openapi/markets-v1.yaml)**.

## 2. OpenAPI cross-link

All REST operations are defined in the OpenAPI 3.1 document. This file describes
semantics, auth, and realtime channels; schemas are authoritative in YAML.

## 3. Operation inventory

| Method | Path | operationId | Phase | Auth | Spec |
|--------|------|-------------|-------|------|------|
| `GET` | `/markets/eligibility` | `getMarketsEligibility` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/capabilities` | `getMarketsCapabilities` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/events` | `listMarketsEvents` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/events/{eventId}` | `getMarketsEvent` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/markets/{marketId}` | `getMarketsMarket` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/markets/{marketId}/orderbook` | `getMarketsOrderbook` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/markets/{marketId}/history` | `getMarketsHistory` | 1 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/wallets` | `listMyWallets` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/balances` | `listMyBalances` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/orders` | `listMyOrders` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/activity` | `listMyActivity` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/positions` | `listMyPositions` | 4 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/account-wallet/preview` | `previewAccountWallet` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/account-wallet/relay` | `relayAccountWallet` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/approvals/preview` | `previewApproval` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/approvals/relay` | `relayApproval` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/funding/quote` | `quoteFunding` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/funding/track` | `trackFunding` | 2 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/withdrawals/preview` | `previewWithdrawal` | 4 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/withdrawals/submit` | `submitWithdrawal` | 4 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/orders/preview` | `previewOrder` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/orders/submit` | `submitOrder` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/orders/{orderId}/cancel-preview` | `previewCancelOrder` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/orders/{orderId}/cancel` | `cancelOrder` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/positions/operation-preview` | `previewPositionOperation` | 4 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/positions/operation-relay` | `relayPositionOperation` | 4 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/watchlists` | `listWatchlists` | 1 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/watchlists` | `createWatchlist` | 1 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/intelligence/signals` | `listIntelligenceSignals` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/intelligence/whales` | `listWhaleActivity` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/intelligence/wallets/{address}` | `getWalletIntelligence` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/markets/{marketId}/health` | `getMarketHealth` | 3 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/markets/{marketId}/flow` | `getMarketFlow` | 3 | no | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/alerts/rules` | `listAlertRules` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/alerts/rules` | `createAlertRule` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/alerts/inbox` | `listAlertInbox` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/execution-quality` | `getMyExecutionQuality` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `GET` | `/markets/me/journal` | `listTradeJournal` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |
| `POST` | `/markets/me/journal` | `createTradeJournalEntry` | 3 | yes | [OpenAPI](../../../schemas/openapi/markets-v1.yaml) |

## 4. Shared components

- `Money` — amount in base units + currency + decimals
- `DecimalString` — price/probability as string
- `ErrorResponse` — uniform error envelope
- `Idempotency-Key` header — required on mutating POST
- `x-phase` extension — gates operation by rollout phase

## 5. Realtime channels (WebSocket)

| Channel | Auth | Payload |
|---------|------|---------|
| `market.<built-in function id>.book` | optional | snapshot + delta |
| `market.<built-in function id>.trades` | optional | trade tick |
| `user.orders` | required | order status |
| `user.fills` | required | fill event |
| `user.positions` | required | position update |
| `alerts.inbox` | required | alert notification |

Protocol: JSON messages with `type`, `sequence`, `payload`, `emittedAt`.
Resume via `Last-Event-ID`. Heartbeat every 30s.

## 6. Error model

```json
{
  "error": {
    "code": "ELIGIBILITY_DENIED",
    "message": "Trading not available in your region",
    "details": {},
    "requestId": "..."
  }
}
```

## 7. Idempotency

Mutating POST accepts `Idempotency-Key` (UUID). Replay within 24h returns same response.
Stored in `markets.idempotency_keys` (or Redis with PG backing).

## 8. Versioning

URL version `/api/v1`. Breaking changes require v2 + parallel run period.
Clients read `/markets/capabilities` for feature flags.

## 9. Examples

Contract tests in `apps/backend/internal/markets/contract_test.go` load fixtures
from OpenAPI `examples` blocks. TS/Kotlin generated in CI (Phase 6).

## 10. Timeout budget

| Operation class | Server timeout | Client should |
|-----------------|----------------|---------------|
| Catalog GET | 5s | Retry with backoff |
| Preview POST | 10s | No auto-retry |
| Submit POST | 15s | Poll order status |
| Relay POST | 30s | Show pending |

## Appendix 1

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 2

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 3

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 4

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 5

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 6

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 7

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 8

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 9

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 10

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 11

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 12

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 13

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 14

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 15

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 16

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 17

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 18

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 19

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 20

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |

## Appendix 21

| Key | Specification |
|-----|---------------|
| Wave | 3 reviewed 2026-07-25 |
| Venue | Polymarket Gamma/CLOB/on-chain |
| BFF | apps/backend/internal/markets |
| Schema | markets.* PostgreSQL |
| Contract | schemas/openapi/markets-v1.yaml |
| Idempotency | Idempotency-Key header on POST |
| Money | Fixed-point Money schema |
| Phase gating | x-phase OpenAPI extension |
| Fail closed | eligible:false on unknown policy |
| Intelligence | Isolated from trading path ADR-008 |
