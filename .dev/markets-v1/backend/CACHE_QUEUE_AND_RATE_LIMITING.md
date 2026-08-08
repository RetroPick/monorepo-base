# CACHE, QUEUE, AND RATE LIMITING

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

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
