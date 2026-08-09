# NOTIFICATIONS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## Description

This document is the authority for Markets V1 **notification delivery**—in-app inbox, push, email, and (later) webhooks for alerts and transactional messages. It defines type × channel × phase (`alert.matched`, `order.filled`, `funding.credited`, `withdrawal.confirmed`, `signal.retracted`, `security.login`), data model (`markets.notifications`, `markets.alert_deliveries`), the match → inbox → fan-out → receipt pipeline, preferences, retraction behavior, and push rate caps—so users get durable awareness without spam or misleading post-reorg cards.

It sits in Wave 3 beside architecture, domain delivery states, and intelligence alert-rules. Worker home is `apps/backend/cmd/alert-delivery`; queue `alert.dispatch`; WS channel `alerts.inbox`. Idempotency uses UNIQUE(`rule_id`, `signal_id`, `channel`). Retraction is mandatory after `signal.retracted`. Delivery failures must not block trading (ADR-008). V1 excludes marketing; copy stays product-neutral (fills, credits, alerts)—no casino-style wording. Money in templates formats from fixed-point `Money`.

Read this when implementing inbox/push paths, preference UI, or provider fan-out. Prefer intelligence `ALERT_RULES_AND_DELIVERY.md` for rule DSL evaluation and this doc for transport/inbox primitives.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | `alert-delivery` worker owners; API handlers for `GET /markets/alerts/inbox` and alert rules; web/Android inbox + push clients; providers (FCM, email, webhooks) configured via secret manager; preference/settings UI authors. |
| **What** | Notification types by phase/channel (`alert.matched` inbox+push P3, `order.filled` inbox+push P3, `funding.credited` inbox+email P2, `withdrawal.confirmed` inbox+email P4, `signal.retracted` inbox P3, `security.login` email P1); data model (`markets.notifications` inbox, `markets.alert_deliveries` per-channel state); pipeline match → inbox insert → fan-out → receipt; per-category opt-in (no marketing in V1); retraction behavior; push rate limits (100/hour/user, burst 10/min). |
| **When** | Phase 1: security login email. Phase 2: funding credited. Phase 3: alert match, order filled, signal retraction. Phase 4: withdrawal confirmed. Retraction path runs whenever signal-engine emits `signal.retracted` after correction/reorg. Rate limits apply continuously to prevent alert storms. |
| **Where** | Spec: this file. Worker: `apps/backend/cmd/alert-delivery` (see architecture). Tables: `notifications`, `alert_deliveries`, plus `alert_rules` for matching. Realtime: WS channel `alerts.inbox`. Domain delivery states: matched → queued → delivering → delivered|retrying → dead_letter ([DOMAIN_MODEL_AND_STATE_MACHINES.md](./DOMAIN_MODEL_AND_STATE_MACHINES.md)). Queue: `alert.dispatch` Redis stream. Idempotency: UNIQUE(rule_id, signal_id, channel). |
| **Why** | Users need durable inbox + optional push/email for fills, funding, and intelligence alerts without turning the product into a spam cannon. Retraction is mandatory so corrected/reorged signals do not leave misleading notifications. Failures in delivery must not block trading (isolation). Preferences keep channels opt-in; V1 excludes marketing. |
| **How** | On `signal.created` / transactional events: evaluate rules → insert inbox row → enqueue channel jobs → provider send → record delivery receipt or error. Retry with backoff (worker: 5 attempts/channel) then DLQ with reason. On `signal.retracted`: update inbox item; if push already sent, send retraction push. Enforce per-user push caps. Templates/provider IDs live in channel config—not hardcoded in handlers. Copy stays product-neutral (fills, credits, alerts)—avoid casino-style wording. Money figures in templates use fixed-point formatting from `Money`. |

### Worked example

**Happy path — alert match.** Signal-engine emits `signal.created`. `alert-delivery` matches an `alert_rules` row, inserts `markets.notifications`, writes `alert_deliveries` for inbox+push, enqueues `alert.dispatch`, dispatches FCM, records ACK (`notification.sent`), and publishes to WS `alerts.inbox`. User lists inbox via `GET /markets/alerts/inbox`. Idempotency: UNIQUE(`rule_id`, `signal_id`, `channel`).

**Happy path — transactional credit.** Funding path reaches `credited` → type `funding.credited` (Phase 2) writes inbox + email per preferences. Amounts in templates formatted from fixed-point `Money` (no float). Marketing categories are out of V1.

**Failure / retraction / storm.** FCM errors: retry with backoff (worker: up to 5 attempts/channel) → `dead_letter` with reason; inbox row remains so in-app truth persists. Reorg/correction emits `signal.retracted`: update inbox item; send retraction push if already delivered. Push caps: max 100/hour/user, burst 10/min—excess deferred/dropped while inbox continues. Channel opt-out skips that channel only. Delivery outage must not 500 order submit—notifications are isolated from trading (ADR-008).

### Type × channel × phase

| Type | Channel | Phase |
|------|---------|-------|
| `alert.matched` | inbox, push | 3 |
| `order.filled` | inbox, push | 3 |
| `funding.credited` | inbox, email | 2 |
| `withdrawal.confirmed` | inbox, email | 4 |
| `signal.retracted` | inbox (+ retraction push if needed) | 3 |
| `security.login` | email | 1 |

### Pipeline

```text
match → insert inbox → fan-out channels → record receipt
```

Delivery state machine (domain): matched → queued → delivering → delivered | retrying → dead_letter.

### Data model

- `markets.notifications` — user inbox rows
- `markets.alert_deliveries` — per-channel delivery state
- Preferences: per-category channel opt-in; no marketing in V1

### Implementer checklist

- Provider keys via secret manager; template IDs in channel config, not handlers.
- Copy: fills, credits, alerts—product-neutral; avoid casino-style wording.
- SLO target: p95 delivery attempt < 60s after match (architecture worker table).
- Retraction is mandatory for intelligence correctness after reorg.

## 1. Purpose

In-app inbox, push, email, and webhook delivery for alerts and transactional messages.

## 2. Notification types

| Type | Channel | Phase |
|------|---------|-------|
| alert.matched | inbox, push | 3 |
| order.filled | inbox, push | 3 |
| funding.credited | inbox, email | 2 |
| withdrawal.confirmed | inbox, email | 4 |
| signal.retracted | inbox | 3 |
| security.login | email | 1 |

## 3. Data model

- `markets.notifications` — user inbox rows
- `markets.alert_deliveries` — per-channel delivery state

## 4. Delivery pipeline

alert-delivery worker: match → insert inbox → fan-out channels → record receipt.

## 5. Preferences

User channel opt-in stored per notification category. Marketing excluded in V1.

## 6. Retraction

On `signal.retracted`, update inbox item and send retraction push if already delivered.

## 7. Rate limits

Max 100 push/hour/user; burst 10/min. Prevents alert storms.

## Channel config 1

Provider placeholders, retry policy, and template IDs for channel 1.

## Channel config 2

Provider placeholders, retry policy, and template IDs for channel 2.

## Channel config 3

Provider placeholders, retry policy, and template IDs for channel 3.

## Channel config 4

Provider placeholders, retry policy, and template IDs for channel 4.

## Channel config 5

Provider placeholders, retry policy, and template IDs for channel 5.

## Channel config 6

Provider placeholders, retry policy, and template IDs for channel 6.

## Channel config 7

Provider placeholders, retry policy, and template IDs for channel 7.

## Channel config 8

Provider placeholders, retry policy, and template IDs for channel 8.

## Channel config 9

Provider placeholders, retry policy, and template IDs for channel 9.

## Channel config 10

Provider placeholders, retry policy, and template IDs for channel 10.

## Channel config 11

Provider placeholders, retry policy, and template IDs for channel 11.

## Channel config 12

Provider placeholders, retry policy, and template IDs for channel 12.

## Channel config 13

Provider placeholders, retry policy, and template IDs for channel 13.

## Channel config 14

Provider placeholders, retry policy, and template IDs for channel 14.

## Channel config 15

Provider placeholders, retry policy, and template IDs for channel 15.

## Channel config 16

Provider placeholders, retry policy, and template IDs for channel 16.

## Channel config 17

Provider placeholders, retry policy, and template IDs for channel 17.

## Channel config 18

Provider placeholders, retry policy, and template IDs for channel 18.

## Channel config 19

Provider placeholders, retry policy, and template IDs for channel 19.

## Channel config 20

Provider placeholders, retry policy, and template IDs for channel 20.

## Channel config 21

Provider placeholders, retry policy, and template IDs for channel 21.

## Channel config 22

Provider placeholders, retry policy, and template IDs for channel 22.

## Channel config 23

Provider placeholders, retry policy, and template IDs for channel 23.

## Channel config 24

Provider placeholders, retry policy, and template IDs for channel 24.

## Channel config 25

Provider placeholders, retry policy, and template IDs for channel 25.

## Channel config 26

Provider placeholders, retry policy, and template IDs for channel 26.

## Channel config 27

Provider placeholders, retry policy, and template IDs for channel 27.

## Channel config 28

Provider placeholders, retry policy, and template IDs for channel 28.

## Channel config 29

Provider placeholders, retry policy, and template IDs for channel 29.

## Channel config 30

Provider placeholders, retry policy, and template IDs for channel 30.

## Channel config 31

Provider placeholders, retry policy, and template IDs for channel 31.

## Channel config 32

Provider placeholders, retry policy, and template IDs for channel 32.

## Channel config 33

Provider placeholders, retry policy, and template IDs for channel 33.

## Channel config 34

Provider placeholders, retry policy, and template IDs for channel 34.

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
