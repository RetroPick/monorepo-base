# CONTRACT AND CONFORMANCE TESTS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-07-25
**Product:** RetroPick Markets V1
**Wave:** 7 — Security, platform, and testing

## Description

This document is the contract and conformance authority for RetroPick Markets V1: OpenAPI as source of truth (schemas/openapi/markets-v1.yaml), backend contract tests, CI spectral and breaking-change gates, Polymarket ACL golden files, idempotency matrix, web and Android client conformance, and realtime/WS contract expectations (ADR-004).

It sits in Wave 7 with CI openapi jobs and client packages consuming generated types. Idempotency and error shapes are security-adjacent (same key plus different body → 422). Goldens keep Polymarket ACL clean-room mappings stable. Cross-ref backend API docs and RELEASE_VERIFICATION_MATRIX RV-002.

Read this on every schemas or handler PR that changes response shapes, intentional ACL fixture updates, and client releases. Prefer MASTER_TEST_PLAN for how contract fits the pyramid.

It excludes hand-editing generated clients out of band with OpenAPI and shipping legacy epoch routes from Markets clients.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | API owners of `schemas/openapi/markets-v1.yaml`; BFF contract test authors; web/Android client conformance owners; CI spectral/breaking-change reviewers; agents regenerating clients only from canonical OpenAPI. |
| **What** | Contract/conformance: OpenAPI source of truth, backend contract tests, CI spectral gates, Polymarket ACL golden files, idempotency contract (`Idempotency-Key` same body→same 2xx; different body→422), web/Android conformance suites, realtime/WS contract expectations. |
| **When** | On every schemas/PR change; when handlers change response shapes; when ACL fixtures update after intentional upstream mapping changes; client releases. |
| **Where** | Spec: this file. `schemas/openapi/markets-v1.yaml`; golden ACL files; CI openapi job; client packages consuming generated types. Cross-ref backend API docs, RELEASE_VERIFICATION_MATRIX RV-002. |
| **Why** | Shared web/Android API (ADR-004) breaks silently without contract gates. Idempotency and error shapes are security-adjacent (replay). Goldens keep Polymarket ACL clean-room mappings stable. |
| **How** | Lint OpenAPI; run handler contract tests against server; fail on breaking diff without review; update goldens deliberately; assert idempotency matrix; run client conformance against staging/contract env. |

### Idempotency contract (mutations)

| Replay | Expected |
|--------|----------|
| Same key + same body | Same 2xx + same body |
| Same key + different body | 422 |
| Missing key on required POST | 400-class per OpenAPI |

### Conformance surfaces

| Surface | Must prove |
|---------|------------|
| Web client | Uses Markets OpenAPI paths/types only |
| Android client | Same shared API; no legacy epoch routes |
| Realtime | Envelope/op codes match WS contract |
| ACL goldens | Stable Polymarket mapping fixtures |

### CI expectation

Contract and spectral jobs are merge blockers for `schemas/**` and handler PRs that change response envelopes. Goldens update only with an intentional ACL change note in the PR.

### Worked example

**Happy path.** Field added optional to OpenAPI → spectral clean → backend test updated → web/Android types regenerate → conformance green.

**Failure / degraded.** Breaking rename merges without notice → CI breaking-change gate fails. Client ships hardcoded legacy path `/api/v1/legacy/markets` → conformance reject. Idempotency replay with altered preview hash body → 422, not a second upstream submit.

**Never invent.** Hand-editing generated clients out of band with OpenAPI.

## 1. Purpose

OpenAPI contract tests, Polymarket ACL golden files, and client conformance requirements for web and Android.

## 2. Scope

### In scope

- RetroPick Markets V1: `apps/web`, `apps/android`, Go BFF `apps/backend/internal/markets/`.
- Polymarket upstream (Gamma, CLOB V2, relayer/builder).
- PostgreSQL `markets.*`, Redis, workers (ingest, signal-engine, alert-delivery, reconciliation).
- Intelligence, notifications, eligibility, ops tooling.

### Out of scope

- PRISM (`contracts/prism/`).
- Legacy epoch (`/api/v1/legacy/markets/*`).
- Custom exchange ([ADR-001](../architecture/adr/ADR-001-MARKETS-HAS-NO-CUSTOM-EXCHANGE.md)).
- Auto copy trading ([ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)).

## 3. Prerequisites

| Document | Role |
|----------|------|
| [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md) | Navigation |
| [architecture/SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md](../architecture/SYSTEM_CONTEXT_AND_TRUST_BOUNDARIES.md) | Trust boundaries |
| [architecture/DEPLOYMENT_ARCHITECTURE.md](../architecture/DEPLOYMENT_ARCHITECTURE.md) | Deploy units |
| [05_NON_FUNCTIONAL_REQUIREMENTS.md](../05_NON_FUNCTIONAL_REQUIREMENTS.md) | NFRs |
| [phases/PHASE-6-HARDENING-CI-CD-AND-SRE.md](../phases/PHASE-6-HARDENING-CI-CD-AND-SRE.md) | Hardening |

## 4. Authoritative sources

| Source | Location | Confidence |
|--------|----------|------------|
| OpenAPI | `schemas/openapi/markets-v1.yaml` | verified |
| Polymarket docs | https://docs.polymarket.com/ | partially verified |
| ADR suite | `architecture/adr/` | verified |

## 5. Contract source of truth

`schemas/openapi/markets-v1.yaml` — all clients and BFF handlers must conform.

## 6. Backend contract tests

| Test type | Location | Assertion |
|-----------|----------|-----------|
| Example response | `contract_test.go` | Handler output matches schema example |
| Request validation | handler tests | Reject invalid body with 400 |
| Error shape | all handlers | `ErrorResponse` schema |
| Pagination | list endpoints | `cursor` + `limit` bounds |

### 6.1 PHASE-1 backend read conformance (MKT-P1-008)

Durable OpenAPI conformance for PHASE-1 read handlers lives under `apps/backend/internal/markets/`:

| File | Role |
|------|------|
| `openapi_semantics_test.go` | Shared kin-openapi loader/validator and semantic helpers (no fractional floats, freshness/provenance, canonical IDs, no `MoneyAmount` on read payloads) |
| `openapi_conformance_test.go` | `TestOpenAPIRuntimeConformancePhaseOne` — primary gate for eligibility, capabilities, events, event detail, market detail, orderbook, history, health, signals, health probes, and error envelopes |
| `openapi_contract_test.go` | Structural guard on `markets-v1.yaml` v1.1.1 paths and money schemas |
| `handler_test.go` | Behavioral HTTP tests wired to shared OpenAPI + semantic helpers |
| `openapi_runtime_test.go` | Fast smoke tests; full validation defers to conformance suite |

**How to run**

```bash
cd apps/backend
go test ./internal/markets/... \
  -run 'TestOpenAPIRuntimeConformancePhaseOne|TestMarketsOpenAPIContainsPhaseOneReadContract|TestPhaseOne' \
  -count=1 -v
```

Full markets package (recommended before handoff):

```bash
cd apps/backend
go test ./internal/markets/... -count=1
```

**What the suite proves**

- kin-openapi response validation against `schemas/openapi/markets-v1.yaml` v1.1.1 for PHASE-1 GET handlers
- Decimal/money fields encoded as strings (prices, book levels, depths); no fractional JSON numbers; no `MoneyAmount` objects on read responses (MKT-NFR-060)
- `freshness` + `provenance` on upstream-derived catalog and market-data payloads
- Canonical RetroPick IDs (`polymarket:event|market|token:{upstreamId}`)
- Order book `freshness.state=stale` when snapshot age exceeds `BookMaxAge` (MKT-FR-010)
- Structured `ApiError` on invalid pagination and missing `tokenId`
- Upstream ID paths (e.g. `/events/1`) normalize to canonical IDs in responses

**Out of scope for this suite**

- Wallet, order submit, funding POST paths (PHASE-2+) — **exception:** MKT-P2-004 account-wallet link POST paths (`linkExistingWallet`, `previewAccountWallet`, `relayAccountWallet`) are **spec-frozen in YAML**; runtime kin-openapi conformance for wallet writes remains deferred until Chat G2 router wiring and optional contract tests. Validation for the OpenAPI freeze: structural load/validate only (see [MKT-P2-004-openapi-evidence.md](../../../.harness/products/markets-v1/evidence/verification/PHASE-2/MKT-P2-004-openapi-evidence.md)).
- Realtime WebSocket wire conformance (see `realtime/` tests and API doc §13)
- Observability metric wiring (`MKT-P1-009` / Chat J)

**Exit evidence (MKT-P1-008)**

Fill [`VERIFICATION_EVIDENCE_TEMPLATE.md`](../../../.harness/products/markets-v1/templates/VERIFICATION_EVIDENCE_TEMPLATE.md) with command output and traceability:

| Requirement | Test | Expected |
|-------------|------|----------|
| MKT-FR-001 | `TestOpenAPIRuntimeConformancePhaseOne/events` | Pass |
| MKT-FR-002 | `TestOpenAPIRuntimeConformancePhaseOne/market detail` | Pass |
| MKT-FR-010 | `TestOpenAPIRuntimeConformancePhaseOne/orderbook stale when snapshot age exceeded` | Pass |
| MKT-NFR-060 | `assertNoBinaryFloats` / decimal string field guards | Pass |
| MKT-WEB-001 | `TestMarketsOpenAPIContainsPhaseOneReadContract` + kin-openapi | Pass |

**Handoff checklist → Chat K (`MKT-P1-010` PHASE-1 exit gate)**

Prepare (orchestrator executes gate; do not advance `current_phase` from this task):

- [ ] MKT-P1-008 verification evidence archived
- [ ] Full markets package green: `go test ./internal/markets/... -count=1`
- [ ] Invariant grep: `rg "float64|binary float" .dev/markets-v1/backend/ schemas/openapi/` (paste results; test helpers may mention `float64` when decoding JSON integers)
- [ ] Confirm no PHASE-2+ paths tested (wallet, order submit, funding)
- [ ] Chat J (`MKT-P1-009`) observability metrics — separate owned_paths; not blocking contract task
- [ ] Phase gate template ([`PHASE_GATE_TEMPLATE.md`](../../../.harness/products/markets-v1/templates/PHASE_GATE_TEMPLATE.md)) ready for orchestrator review
- [ ] Realtime WS conformance (`sequence:null`, gap recovery) tracked separately for exit gate or PHASE-6 hardening

## 7. OpenAPI CI gates

- Spectral rules: no breaking change without version bump.
- `openapi-diff` on PR against main.
- Generated types drift check (if codegen used).

## 8. ACL golden files

| Upstream | Golden path | Purpose |
|----------|-------------|---------|
| Gamma event | `testdata/gamma/event_*.json` | Normalization |
| CLOB book | `testdata/clob/book_*.json` | Price level mapping |
| CLOB order ack | `testdata/clob/order_ack.json` | Status mapping |

Fuzz: random upstream field additions must not crash parser.

## 9. Idempotency contract

All `POST` mutations require `Idempotency-Key` header:

| Case | Expected status |
|------|-----------------|
| First call | 2xx |
| Replay same key+body | Same 2xx + same body |
| Same key, different body | 422 |

## 10. Web conformance

- TypeScript types from OpenAPI (or hand-maintained parity check).
- MSW mocks match schema for component tests.
- Playwright intercepts validate response shape.

## 11. Android conformance

- Retrofit models match OpenAPI components.
- Contract test: deserialize fixture JSON from `markets-v1.yaml` examples.
- Proguard keeps model fields for serialization.

## 12. Realtime contract

WebSocket messages documented in [backend/API_AND_REALTIME_CONTRACTS.md](../backend/API_AND_REALTIME_CONTRACTS.md):

| Message | Schema version |
|---------|----------------|
| `book.update` | v1 |
| `trade.tick` | v1 |
| `capabilities.changed` | v1 |

## 13. Related documents

- [backend/API_AND_REALTIME_CONTRACTS.md](../backend/API_AND_REALTIME_CONTRACTS.md)
- [polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md](../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md)

## Appendix — CON

| ID | Item | Section | Owner |
|----|------|---------|-------|
| CON-001 | Controlled register entry 1 | §6 | platform-orchestrator |
| CON-002 | Controlled register entry 2 | §7 | platform-orchestrator |
| CON-003 | Controlled register entry 3 | §8 | platform-orchestrator |
| CON-004 | Controlled register entry 4 | §9 | platform-orchestrator |
| CON-005 | Controlled register entry 5 | §10 | platform-orchestrator |
| CON-006 | Controlled register entry 6 | §11 | platform-orchestrator |
| CON-007 | Controlled register entry 7 | §12 | platform-orchestrator |
| CON-008 | Controlled register entry 8 | §13 | platform-orchestrator |
| CON-009 | Controlled register entry 9 | §14 | platform-orchestrator |
| CON-010 | Controlled register entry 10 | §5 | platform-orchestrator |
| CON-011 | Controlled register entry 11 | §6 | platform-orchestrator |
| CON-012 | Controlled register entry 12 | §7 | platform-orchestrator |
| CON-013 | Controlled register entry 13 | §8 | platform-orchestrator |
| CON-014 | Controlled register entry 14 | §9 | platform-orchestrator |
| CON-015 | Controlled register entry 15 | §10 | platform-orchestrator |
| CON-016 | Controlled register entry 16 | §11 | platform-orchestrator |
| CON-017 | Controlled register entry 17 | §12 | platform-orchestrator |
| CON-018 | Controlled register entry 18 | §13 | platform-orchestrator |
| CON-019 | Controlled register entry 19 | §14 | platform-orchestrator |
| CON-020 | Controlled register entry 20 | §5 | platform-orchestrator |
| CON-021 | Controlled register entry 21 | §6 | platform-orchestrator |
| CON-022 | Controlled register entry 22 | §7 | platform-orchestrator |
| CON-023 | Controlled register entry 23 | §8 | platform-orchestrator |
| CON-024 | Controlled register entry 24 | §9 | platform-orchestrator |
| CON-025 | Controlled register entry 25 | §10 | platform-orchestrator |
| CON-026 | Controlled register entry 26 | §11 | platform-orchestrator |
| CON-027 | Controlled register entry 27 | §12 | platform-orchestrator |
| CON-028 | Controlled register entry 28 | §13 | platform-orchestrator |
| CON-029 | Controlled register entry 29 | §14 | platform-orchestrator |
| CON-030 | Controlled register entry 30 | §5 | platform-orchestrator |
| CON-031 | Controlled register entry 31 | §6 | platform-orchestrator |
| CON-032 | Controlled register entry 32 | §7 | platform-orchestrator |
| CON-033 | Controlled register entry 33 | §8 | platform-orchestrator |
| CON-034 | Controlled register entry 34 | §9 | platform-orchestrator |
| CON-035 | Controlled register entry 35 | §10 | platform-orchestrator |
| CON-036 | Controlled register entry 36 | §11 | platform-orchestrator |
| CON-037 | Controlled register entry 37 | §12 | platform-orchestrator |
| CON-038 | Controlled register entry 38 | §13 | platform-orchestrator |
| CON-039 | Controlled register entry 39 | §14 | platform-orchestrator |
| CON-040 | Controlled register entry 40 | §5 | platform-orchestrator |
| CON-041 | Controlled register entry 41 | §6 | platform-orchestrator |
| CON-042 | Controlled register entry 42 | §7 | platform-orchestrator |
| CON-043 | Controlled register entry 43 | §8 | platform-orchestrator |
| CON-044 | Controlled register entry 44 | §9 | platform-orchestrator |
| CON-045 | Controlled register entry 45 | §10 | platform-orchestrator |
| CON-046 | Controlled register entry 46 | §11 | platform-orchestrator |
| CON-047 | Controlled register entry 47 | §12 | platform-orchestrator |
| CON-048 | Controlled register entry 48 | §13 | platform-orchestrator |
| CON-049 | Controlled register entry 49 | §14 | platform-orchestrator |
| CON-050 | Controlled register entry 50 | §5 | platform-orchestrator |
| CON-051 | Controlled register entry 51 | §6 | platform-orchestrator |
| CON-052 | Controlled register entry 52 | §7 | platform-orchestrator |
| CON-053 | Controlled register entry 53 | §8 | platform-orchestrator |
| CON-054 | Controlled register entry 54 | §9 | platform-orchestrator |
| CON-055 | Controlled register entry 55 | §10 | platform-orchestrator |
| CON-056 | Controlled register entry 56 | §11 | platform-orchestrator |
| CON-057 | Controlled register entry 57 | §12 | platform-orchestrator |
| CON-058 | Controlled register entry 58 | §13 | platform-orchestrator |
| CON-059 | Controlled register entry 59 | §14 | platform-orchestrator |
| CON-060 | Controlled register entry 60 | §5 | platform-orchestrator |
| CON-061 | Controlled register entry 61 | §6 | platform-orchestrator |
| CON-062 | Controlled register entry 62 | §7 | platform-orchestrator |
| CON-063 | Controlled register entry 63 | §8 | platform-orchestrator |
| CON-064 | Controlled register entry 64 | §9 | platform-orchestrator |
| CON-065 | Controlled register entry 65 | §10 | platform-orchestrator |
| CON-066 | Controlled register entry 66 | §11 | platform-orchestrator |
| CON-067 | Controlled register entry 67 | §12 | platform-orchestrator |
| CON-068 | Controlled register entry 68 | §13 | platform-orchestrator |
| CON-069 | Controlled register entry 69 | §14 | platform-orchestrator |
| CON-070 | Controlled register entry 70 | §5 | platform-orchestrator |
| CON-071 | Controlled register entry 71 | §6 | platform-orchestrator |
| CON-072 | Controlled register entry 72 | §7 | platform-orchestrator |
| CON-073 | Controlled register entry 73 | §8 | platform-orchestrator |
| CON-074 | Controlled register entry 74 | §9 | platform-orchestrator |
| CON-075 | Controlled register entry 75 | §10 | platform-orchestrator |
| CON-076 | Controlled register entry 76 | §11 | platform-orchestrator |
| CON-077 | Controlled register entry 77 | §12 | platform-orchestrator |
| CON-078 | Controlled register entry 78 | §13 | platform-orchestrator |
| CON-079 | Controlled register entry 79 | §14 | platform-orchestrator |
| CON-080 | Controlled register entry 80 | §5 | platform-orchestrator |
| CON-081 | Controlled register entry 81 | §6 | platform-orchestrator |
| CON-082 | Controlled register entry 82 | §7 | platform-orchestrator |
| CON-083 | Controlled register entry 83 | §8 | platform-orchestrator |
| CON-084 | Controlled register entry 84 | §9 | platform-orchestrator |
| CON-085 | Controlled register entry 85 | §10 | platform-orchestrator |
| CON-086 | Controlled register entry 86 | §11 | platform-orchestrator |
| CON-087 | Controlled register entry 87 | §12 | platform-orchestrator |
| CON-088 | Controlled register entry 88 | §13 | platform-orchestrator |
| CON-089 | Controlled register entry 89 | §14 | platform-orchestrator |
| CON-090 | Controlled register entry 90 | §5 | platform-orchestrator |
| CON-091 | Controlled register entry 91 | §6 | platform-orchestrator |
| CON-092 | Controlled register entry 92 | §7 | platform-orchestrator |
| CON-093 | Controlled register entry 93 | §8 | platform-orchestrator |
| CON-094 | Controlled register entry 94 | §9 | platform-orchestrator |
| CON-095 | Controlled register entry 95 | §10 | platform-orchestrator |
| CON-096 | Controlled register entry 96 | §11 | platform-orchestrator |
| CON-097 | Controlled register entry 97 | §12 | platform-orchestrator |
| CON-098 | Controlled register entry 98 | §13 | platform-orchestrator |
| CON-099 | Controlled register entry 99 | §14 | platform-orchestrator |
| CON-100 | Controlled register entry 100 | §5 | platform-orchestrator |
| CON-101 | Controlled register entry 101 | §6 | platform-orchestrator |
| CON-102 | Controlled register entry 102 | §7 | platform-orchestrator |
| CON-103 | Controlled register entry 103 | §8 | platform-orchestrator |
| CON-104 | Controlled register entry 104 | §9 | platform-orchestrator |
| CON-105 | Controlled register entry 105 | §10 | platform-orchestrator |
| CON-106 | Controlled register entry 106 | §11 | platform-orchestrator |
| CON-107 | Controlled register entry 107 | §12 | platform-orchestrator |
| CON-108 | Controlled register entry 108 | §13 | platform-orchestrator |
| CON-109 | Controlled register entry 109 | §14 | platform-orchestrator |
| CON-110 | Controlled register entry 110 | §5 | platform-orchestrator |
| CON-111 | Controlled register entry 111 | §6 | platform-orchestrator |
| CON-112 | Controlled register entry 112 | §7 | platform-orchestrator |
| CON-113 | Controlled register entry 113 | §8 | platform-orchestrator |
| CON-114 | Controlled register entry 114 | §9 | platform-orchestrator |
| CON-115 | Controlled register entry 115 | §10 | platform-orchestrator |
| CON-116 | Controlled register entry 116 | §11 | platform-orchestrator |
| CON-117 | Controlled register entry 117 | §12 | platform-orchestrator |
| CON-118 | Controlled register entry 118 | §13 | platform-orchestrator |
| CON-119 | Controlled register entry 119 | §14 | platform-orchestrator |
| CON-120 | Controlled register entry 120 | §5 | platform-orchestrator |
| CON-121 | Controlled register entry 121 | §6 | platform-orchestrator |
| CON-122 | Controlled register entry 122 | §7 | platform-orchestrator |
| CON-123 | Controlled register entry 123 | §8 | platform-orchestrator |
| CON-124 | Controlled register entry 124 | §9 | platform-orchestrator |
| CON-125 | Controlled register entry 125 | §10 | platform-orchestrator |
| CON-126 | Controlled register entry 126 | §11 | platform-orchestrator |
| CON-127 | Controlled register entry 127 | §12 | platform-orchestrator |
| CON-128 | Controlled register entry 128 | §13 | platform-orchestrator |
| CON-129 | Controlled register entry 129 | §14 | platform-orchestrator |
| CON-130 | Controlled register entry 130 | §5 | platform-orchestrator |
| CON-131 | Controlled register entry 131 | §6 | platform-orchestrator |
| CON-132 | Controlled register entry 132 | §7 | platform-orchestrator |
| CON-133 | Controlled register entry 133 | §8 | platform-orchestrator |
| CON-134 | Controlled register entry 134 | §9 | platform-orchestrator |
| CON-135 | Controlled register entry 135 | §10 | platform-orchestrator |
| CON-136 | Controlled register entry 136 | §11 | platform-orchestrator |
| CON-137 | Controlled register entry 137 | §12 | platform-orchestrator |
| CON-138 | Controlled register entry 138 | §13 | platform-orchestrator |
| CON-139 | Controlled register entry 139 | §14 | platform-orchestrator |
| CON-140 | Controlled register entry 140 | §5 | platform-orchestrator |
| CON-141 | Controlled register entry 141 | §6 | platform-orchestrator |
| CON-142 | Controlled register entry 142 | §7 | platform-orchestrator |
| CON-143 | Controlled register entry 143 | §8 | platform-orchestrator |
| CON-144 | Controlled register entry 144 | §9 | platform-orchestrator |
| CON-145 | Controlled register entry 145 | §10 | platform-orchestrator |
| CON-146 | Controlled register entry 146 | §11 | platform-orchestrator |
| CON-147 | Controlled register entry 147 | §12 | platform-orchestrator |
| CON-148 | Controlled register entry 148 | §13 | platform-orchestrator |
| CON-149 | Controlled register entry 149 | §14 | platform-orchestrator |
| CON-150 | Controlled register entry 150 | §5 | platform-orchestrator |
| CON-151 | Controlled register entry 151 | §6 | platform-orchestrator |
| CON-152 | Controlled register entry 152 | §7 | platform-orchestrator |
| CON-153 | Controlled register entry 153 | §8 | platform-orchestrator |
| CON-154 | Controlled register entry 154 | §9 | platform-orchestrator |
| CON-155 | Controlled register entry 155 | §10 | platform-orchestrator |
| CON-156 | Controlled register entry 156 | §11 | platform-orchestrator |
| CON-157 | Controlled register entry 157 | §12 | platform-orchestrator |
| CON-158 | Controlled register entry 158 | §13 | platform-orchestrator |
| CON-159 | Controlled register entry 159 | §14 | platform-orchestrator |
| CON-160 | Controlled register entry 160 | §5 | platform-orchestrator |
| CON-161 | Controlled register entry 161 | §6 | platform-orchestrator |
| CON-162 | Controlled register entry 162 | §7 | platform-orchestrator |
| CON-163 | Controlled register entry 163 | §8 | platform-orchestrator |
| CON-164 | Controlled register entry 164 | §9 | platform-orchestrator |
| CON-165 | Controlled register entry 165 | §10 | platform-orchestrator |
| CON-166 | Controlled register entry 166 | §11 | platform-orchestrator |
| CON-167 | Controlled register entry 167 | §12 | platform-orchestrator |
| CON-168 | Controlled register entry 168 | §13 | platform-orchestrator |
| CON-169 | Controlled register entry 169 | §14 | platform-orchestrator |
| CON-170 | Controlled register entry 170 | §5 | platform-orchestrator |
| CON-171 | Controlled register entry 171 | §6 | platform-orchestrator |
| CON-172 | Controlled register entry 172 | §7 | platform-orchestrator |
| CON-173 | Controlled register entry 173 | §8 | platform-orchestrator |
| CON-174 | Controlled register entry 174 | §9 | platform-orchestrator |
| CON-175 | Controlled register entry 175 | §10 | platform-orchestrator |
| CON-176 | Controlled register entry 176 | §11 | platform-orchestrator |
| CON-177 | Controlled register entry 177 | §12 | platform-orchestrator |
| CON-178 | Controlled register entry 178 | §13 | platform-orchestrator |
| CON-179 | Controlled register entry 179 | §14 | platform-orchestrator |
| CON-180 | Controlled register entry 180 | §5 | platform-orchestrator |
| CON-181 | Controlled register entry 181 | §6 | platform-orchestrator |
| CON-182 | Controlled register entry 182 | §7 | platform-orchestrator |
| CON-183 | Controlled register entry 183 | §8 | platform-orchestrator |
| CON-184 | Controlled register entry 184 | §9 | platform-orchestrator |
| CON-185 | Controlled register entry 185 | §10 | platform-orchestrator |
| CON-186 | Controlled register entry 186 | §11 | platform-orchestrator |
| CON-187 | Controlled register entry 187 | §12 | platform-orchestrator |
| CON-188 | Controlled register entry 188 | §13 | platform-orchestrator |
| CON-189 | Controlled register entry 189 | §14 | platform-orchestrator |
| CON-190 | Controlled register entry 190 | §5 | platform-orchestrator |
| CON-191 | Controlled register entry 191 | §6 | platform-orchestrator |
| CON-192 | Controlled register entry 192 | §7 | platform-orchestrator |
| CON-193 | Controlled register entry 193 | §8 | platform-orchestrator |
| CON-194 | Controlled register entry 194 | §9 | platform-orchestrator |
| CON-195 | Controlled register entry 195 | §10 | platform-orchestrator |
| CON-196 | Controlled register entry 196 | §11 | platform-orchestrator |
| CON-197 | Controlled register entry 197 | §12 | platform-orchestrator |
| CON-198 | Controlled register entry 198 | §13 | platform-orchestrator |
| CON-199 | Controlled register entry 199 | §14 | platform-orchestrator |
| CON-200 | Controlled register entry 200 | §5 | platform-orchestrator |
| CON-201 | Controlled register entry 201 | §6 | platform-orchestrator |
| CON-202 | Controlled register entry 202 | §7 | platform-orchestrator |
| CON-203 | Controlled register entry 203 | §8 | platform-orchestrator |
| CON-204 | Controlled register entry 204 | §9 | platform-orchestrator |
| CON-205 | Controlled register entry 205 | §10 | platform-orchestrator |
| CON-206 | Controlled register entry 206 | §11 | platform-orchestrator |
| CON-207 | Controlled register entry 207 | §12 | platform-orchestrator |
| CON-208 | Controlled register entry 208 | §13 | platform-orchestrator |
| CON-209 | Controlled register entry 209 | §14 | platform-orchestrator |
| CON-210 | Controlled register entry 210 | §5 | platform-orchestrator |
| CON-211 | Controlled register entry 211 | §6 | platform-orchestrator |
| CON-212 | Controlled register entry 212 | §7 | platform-orchestrator |
| CON-213 | Controlled register entry 213 | §8 | platform-orchestrator |
| CON-214 | Controlled register entry 214 | §9 | platform-orchestrator |
| CON-215 | Controlled register entry 215 | §10 | platform-orchestrator |
| CON-216 | Controlled register entry 216 | §11 | platform-orchestrator |
| CON-217 | Controlled register entry 217 | §12 | platform-orchestrator |
| CON-218 | Controlled register entry 218 | §13 | platform-orchestrator |
| CON-219 | Controlled register entry 219 | §14 | platform-orchestrator |
| CON-220 | Controlled register entry 220 | §5 | platform-orchestrator |
| CON-221 | Controlled register entry 221 | §6 | platform-orchestrator |
| CON-222 | Controlled register entry 222 | §7 | platform-orchestrator |
| CON-223 | Controlled register entry 223 | §8 | platform-orchestrator |
| CON-224 | Controlled register entry 224 | §9 | platform-orchestrator |
| CON-225 | Controlled register entry 225 | §10 | platform-orchestrator |
| CON-226 | Controlled register entry 226 | §11 | platform-orchestrator |
| CON-227 | Controlled register entry 227 | §12 | platform-orchestrator |
| CON-228 | Controlled register entry 228 | §13 | platform-orchestrator |
| CON-229 | Controlled register entry 229 | §14 | platform-orchestrator |
| CON-230 | Controlled register entry 230 | §5 | platform-orchestrator |
| CON-231 | Controlled register entry 231 | §6 | platform-orchestrator |
| CON-232 | Controlled register entry 232 | §7 | platform-orchestrator |
| CON-233 | Controlled register entry 233 | §8 | platform-orchestrator |
| CON-234 | Controlled register entry 234 | §9 | platform-orchestrator |
| CON-235 | Controlled register entry 235 | §10 | platform-orchestrator |
| CON-236 | Controlled register entry 236 | §11 | platform-orchestrator |
| CON-237 | Controlled register entry 237 | §12 | platform-orchestrator |
| CON-238 | Controlled register entry 238 | §13 | platform-orchestrator |
| CON-239 | Controlled register entry 239 | §14 | platform-orchestrator |
| CON-240 | Controlled register entry 240 | §5 | platform-orchestrator |
| CON-241 | Controlled register entry 241 | §6 | platform-orchestrator |
| CON-242 | Controlled register entry 242 | §7 | platform-orchestrator |
| CON-243 | Controlled register entry 243 | §8 | platform-orchestrator |
| CON-244 | Controlled register entry 244 | §9 | platform-orchestrator |
| CON-245 | Controlled register entry 245 | §10 | platform-orchestrator |
| CON-246 | Controlled register entry 246 | §11 | platform-orchestrator |
| CON-247 | Controlled register entry 247 | §12 | platform-orchestrator |
| CON-248 | Controlled register entry 248 | §13 | platform-orchestrator |
| CON-249 | Controlled register entry 249 | §14 | platform-orchestrator |
| CON-250 | Controlled register entry 250 | §5 | platform-orchestrator |
| CON-251 | Controlled register entry 251 | §6 | platform-orchestrator |
| CON-252 | Controlled register entry 252 | §7 | platform-orchestrator |
| CON-253 | Controlled register entry 253 | §8 | platform-orchestrator |
| CON-254 | Controlled register entry 254 | §9 | platform-orchestrator |
| CON-255 | Controlled register entry 255 | §10 | platform-orchestrator |
| CON-256 | Controlled register entry 256 | §11 | platform-orchestrator |
| CON-257 | Controlled register entry 257 | §12 | platform-orchestrator |
| CON-258 | Controlled register entry 258 | §13 | platform-orchestrator |
| CON-259 | Controlled register entry 259 | §14 | platform-orchestrator |
| CON-260 | Controlled register entry 260 | §5 | platform-orchestrator |
| CON-261 | Controlled register entry 261 | §6 | platform-orchestrator |
| CON-262 | Controlled register entry 262 | §7 | platform-orchestrator |
| CON-263 | Controlled register entry 263 | §8 | platform-orchestrator |
| CON-264 | Controlled register entry 264 | §9 | platform-orchestrator |
| CON-265 | Controlled register entry 265 | §10 | platform-orchestrator |
| CON-266 | Controlled register entry 266 | §11 | platform-orchestrator |
| CON-267 | Controlled register entry 267 | §12 | platform-orchestrator |
| CON-268 | Controlled register entry 268 | §13 | platform-orchestrator |
| CON-269 | Controlled register entry 269 | §14 | platform-orchestrator |

## Wave 7 cross-reference index

| Topic | Primary doc |
|-------|-------------|
| STRIDE threats | security/THREAT_MODEL.md |
| Preview integrity | security/SIGNING_AND_TRANSACTION_INTEGRITY.md |
| Rate limits | security/ABUSE_FRAUD_AND_RATE_LIMITS.md |
| SLOs | platform/OBSERVABILITY_SLOS_AND_ALERTS.md |
| E2E journeys | testing/END_TO_END_CRITICAL_JOURNEYS.md |
| Launch gates | testing/RELEASE_VERIFICATION_MATRIX.md |

## Acceptance criteria

- Status `reviewed`; links valid per [00_DOCUMENT_MAP.md](../00_DOCUMENT_MAP.md).
- Tasks trace to [../../../.harness/products/markets-v1/planning/REQUIREMENTS_TO_TASK_TRACEABILITY.md](../../../.harness/products/markets-v1/planning/REQUIREMENTS_TO_TASK_TRACEABILITY.md).

## Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-07-24 | platform-orchestrator | Initial stub |
| 2026-07-25 | platform-orchestrator | Wave 7 expansion |
