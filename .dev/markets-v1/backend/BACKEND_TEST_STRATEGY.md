# BACKEND TEST STRATEGY

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## Description

This document is the **test pyramid and CI gate** authority for the Markets V1 greenfield backend. It defines unit (domain/state machines/money), integration (store + testcontainers Postgres), contract (`contract_test.go` vs OpenAPI examples + ACL goldens + idempotency replay), e2e critical journeys, and chaos isolation—so harness tasks are not marked done on wiring alone and projection/eligibility safety properties stay locked in CI.

It sits in Wave 3 beside architecture, OpenAPI, and domain state machines. Tests colocate under `apps/backend/internal/markets/...`; migrations under `apps/backend/migrations/markets/`. Required CI: `go test ./internal/markets/...`, spectral OpenAPI lint, migration up/down, and no legacy imports into `internal/markets`. Case themes map to requirements (eligibility denial, idempotency, upstream 503, stale catalog, unknown-order reconcile, signal retraction, alert DLQ). Do not weaken assertions to match broken projection behavior.

Read this when adding OpenAPI ops, state edges, or worker paths, or before claiming a Markets backend task complete. Prefer sibling docs for architecture topology and domain transition tables—not for which layer owns which proof.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | Backend engineers and `qa-integration` owning `go test ./internal/markets/...`; contract-test maintainers of OpenAPI examples; worker authors (ingest, signal-engine, alert-delivery, reconciliation); CI owners (spectral, migration up/down, no-legacy-import check); staging operators for limited-wallet e2e. |
| **What** | Test pyramid for Markets greenfield: unit (domain/state machines), integration (store + testcontainers Postgres), contract (`contract_test.go` vs `markets-v1.yaml` examples + Gamma/CLOB ACL golden files + idempotency replay), e2e critical journeys (staging + playwright trigger), chaos (toxiproxy / kill pods for worker isolation). Environments: local mocks, CI wiremock+ephemeral DB, staging Polymarket read + limited wallet, prod live. Catalog of cases mapped to requirements (happy path, eligibility denial, idempotency, upstream 503, stale catalog, unknown-order reconcile, signal retraction, alert DLQ). |
| **When** | On every PR touching `internal/markets`, OpenAPI, or `migrations/markets`. Before marking a harness task done—wiring alone is insufficient. After state-machine or ACL changes, refresh golden fixtures. Chaos/e2e before production phase gates, not as a substitute for unit/contract. |
| **Where** | Tests colocated under `apps/backend/internal/markets/...`; OpenAPI at `schemas/openapi/markets-v1.yaml`; migrations under `apps/backend/migrations/markets/`; requirements traceability in [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md). CI gates listed in §5. Do not weaken assertions to match broken projection behavior—fix code or mark known gaps explicitly. |
| **Why** | Projection correctness and fail-closed eligibility are safety properties: wrong money math, double submit, or trading coupled to intelligence failures become user-facing incidents. Contract tests keep web/Android and Go BFF aligned. Worker tests prove replay/idempotency and isolation (signal down ≠ trading down). Migration up/down prevents stuck deploys. |
| **How** | Write domain unit tests for every From→To edge and money fixed-point invariant. Integration: spin PG, apply migrations, assert sqlc store upserts on upstream keys. Contract: load YAML examples, assert JSON schema + error envelope; replay POST with same `Idempotency-Key`. Workers: fixture upstream JSON → expected rows; deterministic signal hash; mock FCM → inbox+delivery rows; inject drift → repair. CI: `go test ./internal/markets/...`, spectral, migrate up/down, forbid legacy imports. Chaos: partition Redis/CLOB and assert degraded modes from architecture table. |

### Worked example

**Happy path — contract + ingest.** PR adds orderbook fields already present in OpenAPI examples. `contract_test.go` fails until handler JSON matches schema (`DecimalString` prices, fixed-point `Money`, no float). Ingest test feeds Gamma/CLOB fixture → expects `catalog_*` / `market_data_*` rows with UNIQUE(`upstream_source`,`upstream_id`). Unit test covers order `submitted` → `unknown` on timeout and allowed From→To edges only.

**Happy path — worker suite.** Signal-engine: fixed input stream → deterministic output hash / fingerprint. Alert-delivery: mock FCM → assert `notifications` + `alert_deliveries`. Reconciliation: inject drift → assert repair upsert and `reconciliation_runs` metrics. Migration CI: up then down on ephemeral PG.

**Failure / regression gates.** Eligibility denial → fail-closed body, not 200 eligible. Upstream 503 → stale catalog label or trading 503—not fabricated fills. Idempotency replay → single `order_attempts` side effect. Missing fill repair without auto-resubmit. Signal retraction updates inbox. Alert DLQ after max channel failures. Chaos: kill signal-engine → order preview still succeeds; partition Redis → PG fallback path. **Do not weaken tests** to match broken projection behavior—fix code or document an explicit known gap.

### Pyramid

| Layer | Scope | Tools |
|-------|-------|-------|
| Unit | domain, state machines, money math | Go `testing` |
| Integration | store + migrations | testcontainers-go PG |
| Contract | OpenAPI examples, ACL goldens, idempotency | `contract_test.go` |
| E2E | critical journeys | staging + playwright trigger |
| Chaos | worker isolation | toxiproxy, kill pods |

### CI gates (must stay green)

- `go test ./internal/markets/...`
- OpenAPI lint (spectral)
- Migration up/down on ephemeral DB
- No legacy domain imports into `internal/markets`

### Environments

| Env | Upstream | Data |
|-----|----------|------|
| local | mocks/fixtures | docker PG |
| CI | wiremock | ephemeral |
| staging | Polymarket read + limited wallet | anonymized |
| prod | live | real |

### Requirement-linked case themes

Map to [04_REQUIREMENTS_AND_TRACEABILITY.md](../04_REQUIREMENTS_AND_TRACEABILITY.md): happy path, eligibility denial, idempotency replay, upstream 503, stale catalog, unknown-order reconciliation, signal retraction, alert DLQ, fixed-point money round-trips, phase-gated capability false.

### Implementer checklist

- New OpenAPI op → examples + contract test in the same PR.
- New state edge → unit test before handler wiring.
- Worker change → fixture → expected rows; assert isolation from trading.
- Harness task not complete until tests assert behavior (not just docs/wiring).

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
