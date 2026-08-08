# API AND REALTIME CONTRACTS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

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
