# CACHE, QUEUE, AND RATE LIMITING

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## Description

This document is the authority for **Redis caching, job queues, rate limits, and backpressure** in the Markets V1 backend. It defines key families and TTLs (`mkt:event:*`, `mkt:book:*`, eligibility, capabilities), invalidation hooks, queues (`feature.extract`, `alert.dispatch`, PG `reconcile.shard`), DLQ (`markets.dead_letter_jobs`), tiered rate limits, and shed order that drops intelligence before order-submit ack—so hot book data stays fresh without treating cache as venue authority.

It sits in Wave 3 beside architecture and API contracts. Runtime uses `MARKETS_REDIS_URL` with PG fallback when Redis is down; stale catalog responses carry `"stale": true`. Token buckets emit `X-RateLimit-*`. Money in cached payloads remains fixed-point per OpenAPI. Cache accelerates projections only—never ownership truth.

Read this when wiring read-through caches, enqueue paths, limiter middleware, or queue-depth alerts. Prefer sibling docs for worker topology and eligibility decision semantics—not for TTL/queue/rate tables.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | API middleware authors (rate limit, cache read-through), ingest publishers of invalidation events, signal-engine / alert-delivery / reconciliation consumers, SRE tuning TTLs and queue depth alerts, client authors honoring `X-RateLimit-*` and `stale` flags. |
| **What** | Redis key families and TTLs (`mkt:event:{id}` 60s, `mkt:market:{id}` 30s, `mkt:book:{id}` 2s, `mkt:capabilities` 10s, `mkt:eligibility:{ip_hash}` 300s) with invalidation hooks (`catalog.updated`, `book.snapshot`, deploy/flag, policy change); queues (`feature.extract` and `alert.dispatch` Redis streams; `reconcile.shard` via PG `SKIP LOCKED`); DLQ table `markets.dead_letter_jobs`; tiered rate limits (anon 60/min catalog, auth 300/min me/*, trading 30/min preview+submit, intelligence 120/min); backpressure that sheds intelligence before order-submit ack. |
| **When** | On every catalog/book read path, every enqueue after ingest, every alert fan-out, every reconcile shard claim, and every public/auth request hitting limiters. Tune when hit-ratio or p95 latency misses SLOs; warm top-N markets on deploy cold start. |
| **Where** | Spec: this file. Runtime: Redis from `MARKETS_REDIS_URL`; PG fallback/DLQ when Redis unavailable (see architecture failure table). Invalidation producers: markets-ingest event publish. Consumers: signal-engine, alert-delivery, reconciliation. Rate-limit headers on HTTP responses from `cmd/markets-api`. Stale labeling is part of API JSON, not a silent lie about freshness. |
| **Why** | Book data is hot and short-lived; catalog can tolerate tens of seconds; eligibility decisions are expensive and should be cached by hashed IP without storing raw PII. Queues decouple ingest from intelligence so trading stays up when signal workers lag. Rate limits protect CLOB/ACL and compute; backpressure priority protects user money-path acknowledgements. Cache is never ownership authority—only a projection accelerator. |
| **How** | Read-through: try Redis → on miss load PG projection → set TTL. On `catalog.updated`/`book.snapshot`, delete or overwrite keys. Enqueue jobs with idempotent payload keys; failed jobs → DLQ with error JSON after retries. Token bucket per `user_id` or IP; return `X-RateLimit-*`. If queue depth > threshold, drop/ defer `feature.extract` / noncritical intelligence first; never shed the order submit ack path. When Redis is down, serve PG directly and use PG-backed queue fallback. Money in cached payloads remains fixed-point strings/ints as in OpenAPI. |

### Worked example

**Happy path — book cache.** Ingest writes a snapshot and publishes `book.snapshot`. API `getMarketsOrderbook` serves `mkt:book:{id}` (TTL 2s) with `DecimalString` levels. Concurrently `feature.extract` lands on the Redis stream; signal-engine processes without blocking the HTTP handler. Authenticated `me/*` GETs share a 300/min bucket; trading POSTs use the tighter 30/min bucket. Cold start warms top-N markets by volume.

**Happy path — alert queue.** Matched alert enqueues `alert.dispatch`; alert-delivery consumers fan out channels and ack. Reconcile shards claim work via PG `SKIP LOCKED` on `reconcile.shard`—independent of Redis stream health for trading repair.

**Failure / degraded.** Redis outage: handlers bypass cache to PG; streams unavailable → PG fallback; DLQ (`markets.dead_letter_jobs`) captures poison payloads with error JSON. Queue storm: shed intelligence (`feature.extract`) first; **never** shed order-submit ack path. Eligibility cache serves recent decision; policy change invalidates `mkt:eligibility:*`. Rate-limit exceed → 429 + `X-RateLimit-*`; clients backoff. Stale catalog under Gamma outage returns `"stale": true, "checkedAt": "..."`—cache is not venue authority.

### Cache key map

| Key | TTL | Bust on |
|-----|-----|---------|
| `mkt:event:{id}` | 60s | `catalog.updated` |
| `mkt:market:{id}` | 30s | `catalog.updated` |
| `mkt:book:{id}` | 2s | `book.snapshot` |
| `mkt:capabilities` | 10s | deploy / flag change |
| `mkt:eligibility:{ip_hash}` | 300s | policy change |

### Queues

| Queue | Transport | Consumer |
|-------|-----------|----------|
| `feature.extract` | Redis stream | signal-engine |
| `alert.dispatch` | Redis stream | alert-delivery |
| `reconcile.shard` | PG SKIP LOCKED | reconciliation |

### Rate tiers

| Tier | Limit | Scope |
|------|-------|-------|
| Anonymous | 60/min | catalog GET |
| Authenticated | 300/min | `me/*` GET |
| Trading | 30/min | preview+submit |
| Intelligence | 120/min | signals, whales |

### Implementer checklist

- Token bucket per `user_id` or IP; always emit `X-RateLimit-*`.
- Monitor hit ratio and p95 per key family; adjust TTL vs freshness SLO.
- Cached payloads must preserve fixed-point money / decimal strings.
- Backpressure priority: trading ack > catalog > intelligence jobs.

## 1. Purpose

Redis caching, job queues, rate limits, and backpressure for Markets backend.

## 2. Cache layers

| Key pattern | TTL | Invalidation |
|-------------|-----|--------------|
| `mkt:event:{id}` | 60s | catalog.updated |
| `mkt:market:{id}` | 30s | catalog.updated |
| `mkt:book:{id}` | 2s | book.snapshot |
| `mkt:capabilities` | 10s | deploy / flag change |
| `mkt:eligibility:{ip_hash}` | 300s | policy change |

Stale reads labeled in API response: `"stale": true, "checkedAt": "..."`.

## 3. Queues

| Queue | Transport | Consumers |
|-------|-----------|-----------|
| feature.extract | Redis stream | signal-engine |
| alert.dispatch | Redis stream | alert-delivery |
| reconcile.shard | PG SKIP LOCKED | reconciliation |

DLQ: `markets.dead_letter_jobs` table with payload JSON and error.

## 4. Rate limiting

| Tier | Limit | Scope |
|------|-------|-------|
| Anonymous | 60/min | catalog GET |
| Authenticated | 300/min | me/* GET |
| Trading | 30/min | preview+submit |
| Intelligence | 120/min | signals, whales |

Implementation: Redis token bucket per `user_id` or IP. Headers: `X-RateLimit-*`.

## 5. Backpressure

When queue depth > threshold: shed intelligence jobs first; never shed order submit ack path.

## Cache tuning note 1

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 2

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 3

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 4

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 5

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 6

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 7

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 8

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 9

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 10

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 11

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 12

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 13

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 14

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 15

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 16

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 17

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 18

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 19

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 20

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 21

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 22

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 23

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 24

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 25

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 26

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 27

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 28

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

## Cache tuning note 29

Monitor hit ratio and p95 latency per key family. Adjust TTL vs freshness SLO.
Cold start: warm top-N markets by volume on deploy.

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
