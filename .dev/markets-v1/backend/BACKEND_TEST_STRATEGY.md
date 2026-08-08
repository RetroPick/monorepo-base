# BACKEND TEST STRATEGY

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## 1. Purpose

Testing approach for Markets backend: unit, integration, contract, e2e, chaos.

## 2. Pyramid

| Layer | Scope | Tools |
|-------|-------|-------|
| Unit | domain, state machines | Go testing |
| Integration | store + testcontainers PG | testcontainers-go |
| Contract | OpenAPI examples | contract_test.go |
| E2E | critical journeys | staging + playwright trigger |
| Chaos | worker isolation | toxiproxy, kill pods |

## 3. Contract tests

- Load `markets-v1.yaml` examples; assert handler JSON matches schema.
- Golden files for Gamma/CLOB ACL normalization.
- Idempotency replay tests for all POST operations.

## 4. Worker tests

- Ingest: fixture upstream JSON → expected DB rows.
- Signal-engine: deterministic output hash for fixed input stream.
- Alert-delivery: mock FCM; assert inbox + delivery rows.
- Reconciliation: inject drift; assert repair.

## 5. CI gates

- `go test ./internal/markets/...`
- OpenAPI lint (spectral)
- Migration up/down on ephemeral DB
- No legacy imports check

## 6. Environments

| Env | Upstream | Data |
|-----|----------|------|
| local | mocks/fixtures | docker PG |
| CI | wiremock | ephemeral |
| staging | Polymarket read + limited wallet | anonymized |
| prod | live | real |

## Test case catalog 1

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 2

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 3

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 4

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 5

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 6

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 7

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 8

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 9

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 10

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 11

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 12

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 13

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 14

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 15

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 16

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 17

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 18

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 19

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 20

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 21

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 22

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 23

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 24

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 25

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 26

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 27

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 28

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 29

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 30

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

## Test case catalog 31

Mapped to requirement IDs in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md).
Includes happy path, eligibility denial, idempotency replay, upstream 503, stale catalog,
unknown order reconciliation, signal retraction, and alert DLQ.

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
