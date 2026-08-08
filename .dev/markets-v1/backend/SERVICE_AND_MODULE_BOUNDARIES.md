# SERVICE AND MODULE BOUNDARIES

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## Description

This document is the **bounded-context index** for Markets V1 backend modules. For each context (catalog, market-data ingest, public-query, order-preview, wallets, portfolio projection, chain-indexer, reconciliation, funding/withdrawals, eligibility, notifications, signal-engine, alerts, health analytics, and more) it records owned tables, processes, phase, SLOs, idempotency, credentials, and deployment unit—plus the internal event catalog and Go import lattice—so features land in one owner without forbidden couplings.

It sits in Wave 3 beside architecture and database ownership. Rules: `handler` → `service` → `store`/`acl`/`domain`; workers must not import `handler`; Polymarket types stop at `acl/`. Hard rails: `signal-engine` must not call CLOB submit; `public-query` must not write trading state (except audit); order-preview must not import intelligence. Events (`catalog.updated`, `trade.ingested`, `signal.created`/`retracted`, …) are internal bus names—not client WebSocket channels. Money crosses ACL → domain as fixed-point only.

Read this before adding a table, handler, worker consumer, or cross-package import. Prefer sibling docs for process topology detail and OpenAPI client channels—not for context ownership or import rules.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | Module owners (platform-backend, intelligence-team, platform-sre) implementing or reviewing packages under `internal/markets/`; harness agents (`be-api`, `be-indexer`, `be-realtime`, `be-data`) deciding where a feature lives; reviewers enforcing forbidden couplings before merge. |
| **What** | Bounded-context index: for each context (market-catalog, market-data-ingest, public-query, order-preview-orchestration, account-wallet-metadata, portfolio-activity-projection, chain-indexer, reconciliation, funding-withdrawal-tracking, eligibility-policy, notifications, intelligence-ingest, signal-engine, wallet-profiler, alert-rules-delivery, market-health-analytics, relationship-scanner, administration-operations) the owned tables, processes, phase, SLOs, idempotency, credentials, and deployment unit. Plus internal event catalog and Go import rules (`handler` → `service` → `store`/`acl`/`domain`; workers must not import `handler`). Anti-corruption: Polymarket types stop at `acl/`. |
| **When** | Before adding a table, handler, worker consumer, or cross-package import. When a PR would let `signal-engine` call CLOB submit, let `public-query` write trading state, or let order-preview import intelligence—stop and re-home the change. Phase column gates which contexts are in-scope for the current rollout. |
| **Where** | Spec authority: this file. Process/SLO detail: [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md). Schema ownership: [DATABASE_AND_MIGRATIONS.md](./DATABASE_AND_MIGRATIONS.md). Events in the catalog (`catalog.updated`, `trade.ingested`, `book.snapshot`, `chain.log`, `signal.created`/`retracted`, `notification.sent`, `reconciliation.drift`, `order.submitted`) are internal contracts between `cmd/*` processes—not client WebSocket names (those live in API/realtime docs). |
| **Why** | Projection ownership without venue ownership: each context writes only its tables; venue/chain remain authority. Isolation keeps intelligence, alerts, and catalog lag from blocking order ack. ACL boundaries prevent Gamma/CLOB schema churn from leaking into `domain` and handlers. Forbidden couplings are the hard safety rails. |
| **How** | Pick the context whose responsibility matches; place writes in its owned tables only; emit/consume listed events; keep credentials as service keys (no user private keys in workers). Follow import table: `store` = sqlc only; `acl/*` translate upstream → domain; version skew via adapter + `builder_fee_versions` pinning. Scale and fail per context (circuit breakers toward trading). Money and sizes stay fixed-point at domain boundaries. |

### Worked example

**Happy path — trade ingest → signal without trading coupling.** `market-data-ingest` (markets-ingest) writes `market_data_*` / `raw_upstream_events` and emits `trade.ingested`. `intelligence-ingest` / `signal-engine` consume that event, write `market_signals` + `signal_evidence`, emit `signal.created`. `alert-rules-delivery` fans out to inbox/push. `order-preview-orchestration` never imports those packages; submit still goes API → service → `acl/clob` only. `public-query` serves catalog reads from projections/replicas and does not mutate `orders`.

**Happy path — wallet + funding contexts.** `account-wallet-metadata` owns `wallet_accounts` (API + relayer ACL, Phase 2). `funding-withdrawal-tracking` owns `funding_operations` / `withdrawal_operations`. Portfolio fills/positions are `portfolio-activity-projection` (Phase 4, reconciliation process)—still projections of venue/chain, not a second ledger.

**Failure / boundary violation.** A PR that has signal-engine POST to CLOB submit is rejected by forbidden couplings. If CLOB types appear in `handler` without ACL mapping, require an `acl/` adapter + contract fixture refresh + `builder_fee_versions` pin if fees skew. If reconciliation repairs fills, it writes projection tables and emits `reconciliation.drift`—not a second order-submit path. DLQ/idempotency: at-least-once with natural keys per context.

### Forbidden couplings (non-negotiable)

1. `signal-engine` MUST NOT call CLOB submit endpoints.
2. `public-query` MUST NOT write trading state except audit.
3. `order-preview-orchestration` MUST NOT import intelligence packages.

### Go import lattice

| Module | May import |
|--------|------------|
| `handler` | `service`, `domain`, `platform/httpx` |
| `service` | `store`, `acl`, `domain` |
| `store` | sqlc only |
| `acl/*` | platform HTTP client; translate to `domain` |
| `workers/*` | `store`, `acl`, `domain` — **not** `handler` |

### Event catalog (internal bus — not client WS names)

Producers/consumers: `catalog.updated`, `trade.ingested`, `book.snapshot`, `chain.log`, `signal.created`, `signal.retracted`, `notification.sent`, `reconciliation.drift`, `order.submitted`. Client channel names live in API/realtime docs.

### Implementer checklist

- Pick exactly one owning context for each new table write.
- Credentials: service keys only in workers; no user private keys.
- Scale/fail per context; circuit-break toward trading under upstream pain.
- Money/sizes cross ACL → domain as fixed-point only.

## 1. Purpose

Bounded context table per master prompt §9. Defines responsibility, data ownership,
events, and deployment boundaries for Markets backend modules.

## 2. Context index

### market-catalog

| Dimension | Value |
|-----------|-------|
| Responsibility | Normalize Gamma events/markets/outcomes |
| Owned tables | `catalog_*` |
| Processes | markets-ingest, public-query |
| Phase | PHASE-1 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### market-data-ingest

| Dimension | Value |
|-----------|-------|
| Responsibility | Books, trades, candles from CLOB/WS |
| Owned tables | `market_data_*, raw_upstream_events` |
| Processes | markets-ingest |
| Phase | PHASE-1 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### public-query

| Dimension | Value |
|-----------|-------|
| Responsibility | Read APIs for catalog and market data |
| Owned tables | `read replicas of catalog_*` |
| Processes | API handlers |
| Phase | PHASE-1 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### order-preview-orchestration

| Dimension | Value |
|-----------|-------|
| Responsibility | Preview/submit/cancel with ACL |
| Owned tables | `user_orders, order_attempts` |
| Processes | API + CLOB ACL |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### account-wallet-metadata

| Dimension | Value |
|-----------|-------|
| Responsibility | Proxy/Safe linkage, approvals |
| Owned tables | `wallet_accounts` |
| Processes | API + relayer ACL |
| Phase | PHASE-2 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### portfolio-activity-projection

| Dimension | Value |
|-----------|-------|
| Responsibility | Positions, fills, activity feed |
| Owned tables | `fills, position_projections` |
| Processes | reconciliation |
| Phase | PHASE-4 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### chain-indexer

| Dimension | Value |
|-----------|-------|
| Responsibility | Log ingestion and chain_events |
| Owned tables | `chain_events, sync_checkpoints` |
| Processes | markets-ingest |
| Phase | PHASE-1 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### reconciliation

| Dimension | Value |
|-----------|-------|
| Responsibility | Drift detection and repair |
| Owned tables | `reconciliation_runs` |
| Processes | reconciliation worker |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### funding-withdrawal-tracking

| Dimension | Value |
|-----------|-------|
| Responsibility | On-ramp quotes and payout state |
| Owned tables | `funding_operations, withdrawal_operations` |
| Processes | API + partners |
| Phase | PHASE-2/4 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### eligibility-policy

| Dimension | Value |
|-----------|-------|
| Responsibility | Geoblock and policy decisions |
| Owned tables | `eligibility_decisions` |
| Processes | API middleware |
| Phase | PHASE-1 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### notifications

| Dimension | Value |
|-----------|-------|
| Responsibility | Inbox and delivery receipts |
| Owned tables | `notifications, alert_deliveries` |
| Processes | alert-delivery |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### intelligence-ingest

| Dimension | Value |
|-----------|-------|
| Responsibility | Feature extraction inputs |
| Owned tables | `raw_upstream_events (read)` |
| Processes | markets-ingest |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### signal-engine

| Dimension | Value |
|-----------|-------|
| Responsibility | Deterministic signals + evidence |
| Owned tables | `market_signals, signal_evidence` |
| Processes | signal-engine |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### wallet-profiler

| Dimension | Value |
|-----------|-------|
| Responsibility | Wallet labels and performance |
| Owned tables | `wallet_profiles, wallet_performance_snapshots` |
| Processes | signal-engine |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### alert-rules-delivery

| Dimension | Value |
|-----------|-------|
| Responsibility | Rule CRUD and fan-out |
| Owned tables | `alert_rules, alert_deliveries` |
| Processes | alert-delivery |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### market-health-analytics

| Dimension | Value |
|-----------|-------|
| Responsibility | Liquidity/spread snapshots |
| Owned tables | `market_health_snapshots` |
| Processes | signal-engine |
| Phase | PHASE-3 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### relationship-scanner

| Dimension | Value |
|-----------|-------|
| Responsibility | Cross-market discrepancies |
| Owned tables | `market_relationships` |
| Processes | signal-engine |
| Phase | PHASE-8 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

### administration-operations

| Dimension | Value |
|-----------|-------|
| Responsibility | Kill switches, fee versions |
| Owned tables | `builder_fee_versions` |
| Processes | ops CLI |
| Phase | PHASE-6 |
| Consumed events | See event catalog below |
| Emitted events | Context-specific (see BACKEND_ARCHITECTURE) |
| Upstream dependencies | Polymarket APIs, chain RPC as applicable |
| Credentials | Service keys; no user private keys in workers |
| Scaling unit | See BACKEND_ARCHITECTURE worker tables |
| Failure isolation | Independent deploy; circuit breakers to trading |
| SLO | Context-specific; catalog < 60s, orders preview < 750ms |
| Retry/DLQ | At-least-once with idempotent consumers |
| Idempotency | Natural keys per entity |
| Deployment unit | `cmd/*` or API route group |
| Owner | platform-backend / intelligence-team |

**Forbidden couplings:**
- `signal-engine` MUST NOT call CLOB submit endpoints.
- `public-query` MUST NOT write trading state except audit.
- `order-preview-orchestration` MUST NOT import intelligence packages.

    ## Event catalog (internal)

    | Event | Producer | Consumers | Payload |
    |-------|----------|-----------|---------|
    | catalog.updated | ingest | API cache, WS | event_id, market_ids |
    | trade.ingested | ingest | signal-engine | trade_id, market_id, notional |
    | book.snapshot | ingest | signal-engine, API cache | market_id, sequence |
    | chain.log | ingest | reconciliation, signal-engine | tx_hash, log_index |
    | signal.created | signal-engine | alert-delivery | signal_id, type, evidence |
    | signal.retracted | signal-engine | alert-delivery | signal_id, reason |
    | notification.sent | alert-delivery | — | delivery_id, channel |
    | reconciliation.drift | reconciliation | ops alert | entity, delta |
    | order.submitted | API | reconciliation | order_id, venue_id |

## Module import rules

| Module | May import |
|--------|------------|
| handler | service, domain, platform/httpx |
| service | store, acl, domain |
| store | sqlc only |
| acl/* | platform/http client |
| workers/* | store, acl, domain — NOT handler |

## Anti-corruption notes 1

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 2

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 3

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 4

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 5

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 6

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 7

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 8

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 9

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 10

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 11

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 12

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 13

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 14

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.

## Anti-corruption notes 15

External Polymarket types STOP at `acl/` package boundary. Services consume
`domain` types only. Version skew handled by adapter translation layer and
`builder_fee_versions` pinning. Upstream field renames require ACL mapping table
update + contract test fixture refresh.
