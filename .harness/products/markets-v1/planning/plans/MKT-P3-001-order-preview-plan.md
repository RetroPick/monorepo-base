# PLAN — MKT-P3-001 Order preview endpoint

**Status:** PLAN (not approved for implementation)  
**Task:** MKT-P3-001  
**Phase:** PHASE-3 — Web Trading Core  
**Date:** 2026-08-09  
**Mode:** PLAN ONLY — no product code changes in this artifact

## Description

Implementation plan for the BFF order preview endpoint: assemble CLOB V2 limit-order preview, bind EIP-712 unsigned payload to a content hash, enforce eligibility + wallet binding, and expose via OpenAPI. Submit (MKT-P3-002) is explicitly out of scope.

## 0. Developer intent (5W+1H)

| Dimension | Intent |
|-----------|--------|
| **Who** | `be-api` agent owning `internal/markets/orders/`; orchestrator for OpenAPI contract-first sequencing; QA for golden vectors |
| **What** | `POST /markets/orders/preview` returning previewId, contentHash, humanSummary, unsignedPayload, expiresAt per SIGNING doc |
| **When** | After PHASE-2 exit authorized and this plan approved; before MKT-P3-002 submit |
| **Where** | `apps/backend/internal/markets/orders/preview.go`, OpenAPI `markets-v1.yaml`, handler/router glue (minimal, if not in owned_paths — separate glue task) |
| **Why** | MKT-FR-030 / MKT-SEC-002 preview-before-sign binding; prevents preview/sign mismatch fund risk |
| **How** | Contract-first OpenAPI → preview service → golden vector tests → evidence; no CLOB POST /order |

### Worked example

User requests BUY 100 USDC @ 0.42 on `polymarket:market:abc` → BFF validates session + eligible + linked maker → fetches market metadata + tick size → assembles unsigned EIP-712 Order (V2 fields) → returns `contentHash` SHA-256 of canonical payload → client displays humanSummary → **stops** (sign/submit is P3-002/P3-004).

---

## 1. Goal

Deliver server-authoritative order preview that:

1. Validates auth, eligibility (`RequireEligible`), and wallet binding (maker in `wallet_accounts`)
2. Assembles CLOB V2-compatible unsigned EIP-712 order fields (EV-001)
3. Returns binding `contentHash` / `preview_hash` aligned with [SIGNING_AND_TRANSACTION_INTEGRITY.md](../../security/SIGNING_AND_TRANSACTION_INTEGRITY.md) and [ORDER_LIFECYCLE.md](../../polymarket/ORDER_LIFECYCLE.md)
4. Attaches builder code server-side during assembly (D-10 / EV-010) — not in client request
5. Fails closed on geoblock deny, unknown market, tick/size violations, unbound maker

**Acceptance headline:** Preview hash matches EIP-712 payload (task-graph acceptance criterion).

---

## 2. Owned paths

Per task-graph (exclusive during implementation):

| Path | Purpose |
|------|---------|
| `apps/backend/internal/markets/orders/preview.go` | Preview service + hash binding |
| `.dev/markets-v1/polymarket/ORDER_LIFECYCLE.md` | Doc updates if preview contract clarifications needed |

**Likely touch (coordinate via glue task if outside owned_paths):**

| Path | Reason |
|------|--------|
| `schemas/openapi/markets-v1.yaml` | **Contract-first** — add preview request/response schemas + route (may need orchestrator-owned OpenAPI task or explicit expansion approval) |
| `apps/backend/internal/markets/handler.go` | Route registration |
| `apps/backend/internal/markets/router.go` | `RequireEligible` group |
| `apps/backend/internal/markets/metrics.go` | `preview_sign_match` / preview latency counters |

**Current state:** No `orders/` package exists; OpenAPI has no `/markets/orders/preview` route yet (account-wallet preview exists at `/markets/account-wallet/preview`).

---

## 3. Dependencies

### Upstream tasks (must be done)

| Task | Dependency |
|------|------------|
| MKT-P2-007 | PHASE-2 exit gate — **done** (conditional on BLK-001 for production eligibility) |
| MKT-P2-005 | Session middleware, `RequireEligible` — **done** |
| MKT-P2-003 | Wallet binding / maker address — **done** |

### Blockers / gates

| ID | Impact on P3-001 |
|----|------------------|
| BLK-001 | Preview route requires `RequireEligible` — **blocked in default deploy** until ops wires geo; implement with fail-closed tests + fixture eligibility |
| BLK-004 | CLOB **submit** not implemented — **does not block preview** (read-only CLOB validation calls OK in plan) |
| BLK-010 | Contract addresses — use registry/env pins; no invented addresses |

### Read-only inputs

- [ORDER_LIFECYCLE.md](../../polymarket/ORDER_LIFECYCLE.md) §6.3–6.5 (identifiers, V2 fields, sequence diagram)
- [SIGNING_AND_TRANSACTION_INTEGRITY.md](../../security/SIGNING_AND_TRANSACTION_INTEGRITY.md) §7 preview response contract
- [AUTH_SESSION_AND_ELIGIBILITY.md](../../backend/AUTH_SESSION_AND_ELIGIBILITY.md) §5 middleware
- [API_SDK_AND_ENDPOINT_REGISTRY.md](../../polymarket/API_SDK_AND_ENDPOINT_REGISTRY.md) — CLOB read endpoints for tick/size validation
- `schemas/openapi/markets-v1.yaml` — extend before handler
- [evidence-register.yaml](../../research/evidence-register.yaml) — EV-001 CLOB V2 fields

---

## 4. OpenAPI shapes (proposed)

Add to `markets-v1.yaml` before implementation:

### Route

```
POST /markets/orders/preview
operationId: previewOrder
security: [sessionCookie]
middleware: auth + RequireEligible
```

### Request (`OrderPreviewRequest`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `marketId` | string | yes | Canonical `polymarket:market:{id}` |
| `tokenId` | string | yes | Outcome token ID |
| `side` | enum `BUY` \| `SELL` | yes | |
| `price` | MoneyAmount / fixed string | yes | No float |
| `size` | MoneyAmount / fixed string | yes | Collateral or shares per side rules |
| `orderType` | enum `LIMIT` | yes | V1: limit only |
| `timeInForce` | enum `GTC` \| `GTD` | no | GTD needs expiry wire field (not in EIP-712 sig per EV-001) |
| `makerAddress` | string | yes | Must match linked wallet |
| `idempotencyKey` | string | no | Dedup previews (SIGNING doc) |

### Response (`OrderPreviewResponse`)

Align ORDER_LIFECYCLE `preview_hash` with SIGNING `contentHash` — **single canonical field** in OpenAPI (recommend `contentHash` + alias note in docs).

| Field | Type | Notes |
|-------|------|-------|
| `previewId` | uuid | Server-issued, single-use store (Redis or PG — migration may defer to in-memory TTL for first slice) |
| `contentHash` | string | SHA-256 hex of canonical unsigned payload |
| `expiresAt` | date-time | ≤ 5 minutes |
| `humanSummary` | object | action, market title, outcome, size, price, estimatedFee, chainId |
| `unsignedPayload` | object | EIP-712 Order struct fields for client/wallet |
| `exchangeDomain` | string | Standard vs neg-risk (handoff to MKT-P3-008) |
| `warnings` | string[] | e.g. fee unknown, stale book |

---

## 5. Implementation steps (post-approval)

1. **OpenAPI** — add schemas + route; validate YAML
2. **Package scaffold** — `internal/markets/orders/` with `preview.go`, tests
3. **Validation layer** — market exists in catalog projection; tick/size from CLOB info or cached metadata
4. **Assembly** — build V2 order struct: `salt`, `maker`, `signer`, `tokenId`, `makerAmount`, `takerAmount`, `side`, `signatureType`, `timestamp`, `metadata`, `builder`
5. **Hash** — canonical JSON → SHA-256 → `contentHash`; store preview record keyed by `previewId`
6. **HTTP handler** — POST handler behind auth + eligible; map errors to OpenAPI problem shapes
7. **Metrics** — `retropick_markets_order_preview_total`, `retropick_markets_preview_sign_match_total` (increment on golden vector pass)
8. **Golden vectors** — testdata file with known payload → expected hash (no mainnet)
9. **Evidence** — `verification/PHASE-3/MKT-P3-001-evidence.md`

---

## 6. Acceptance criteria

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | Preview hash matches EIP-712 payload | Golden vector unit tests |
| 2 | `RequireEligible` enforced — 403 when BLK-001/default deploy | Integration test |
| 3 | Unbound maker rejected | Unit test |
| 4 | Money fields fixed-point strings only | OpenAPI + handler lint |
| 5 | No CLOB POST /order in this task | Grep / invariant |
| 6 | Builder code attached server-side, not accepted from client | Unit test |
| 7 | OpenAPI conformance test for preview route | handler_test.go |

---

## 7. Test plan

| Layer | Tests |
|-------|-------|
| Unit | Hash canonicalization; V2 field assembly; tick/size validation errors |
| Integration | HTTP preview with mock CLOB info + fixture eligibility evaluator |
| Golden vectors | `orders/testdata/preview_vectors.yaml` — payload in → contentHash out |
| Contract | OpenAPI response shape in `handler_test.go` |
| Security | SEC-T-001 prep — wrong hash rejected at submit is P3-002; preview issues correct hash only |

### Verification commands (post-implementation)

```bash
cd apps/backend && go test ./internal/markets/orders/... -count=1
cd apps/backend && go test ./internal/markets/ -run 'OrderPreview|Preview' -count=1
# OpenAPI validate (project standard)
pnpm exec @redocly/cli lint schemas/openapi/markets-v1.yaml
```

---

## 8. Explicit out of scope

- **Order submit** (`POST /markets/orders/submit`) — MKT-P3-002
- **CLOB POST /order** or live mainnet/testnet writes
- **Web order ticket UI** — MKT-P3-004 / MKT-P3-007
- **prepare-sign endpoint** — may be same handler response or P3-002; defer separate route unless ORDER_LIFECYCLE sequence requires split
- **Reconciliation worker** — MKT-P3-005
- **Neg Risk routing logic** — minimal exchange domain hint only; full routing MKT-P3-008
- **Postgres `markets_order_previews` migration** — optional defer; document TTL store choice in evidence
- **Auto copy / signal → order** — ADR-009 forbidden

---

## 9. Handoff notes

### To MKT-P3-002 (CLOB submit)

- Submit must accept `previewId` + `contentHash` + signature; recompute hash → 409 on mismatch
- Idempotency-Key header behavior per SIGNING doc
- Verify preview not expired (410)

### To MKT-P3-004 (Web trading UI)

- Client displays `humanSummary` + `contentHash` before wallet prompt
- Fresh eligibility call before preview POST (web spec)

### To orchestrator

- Confirm OpenAPI expansion ownership before implementation (BLK-006 notes stub endpoints — preview adds real contract)
- PHASE-3 implementation should not start until user approves this plan **and** `current_phase` advance authorized

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| CLOB V2 field drift (EV-001) | Pin evidence register; fixture tests |
| preview_hash vs contentHash naming | Single OpenAPI field; alias in ORDER_LIFECYCLE appendix |
| BLK-001 blocks manual staging preview | Fixture eligibility in dev; document staging retest |
| No orders/ package yet | Greenfield — follow eligibility/wallet package patterns |

---

## 11. Approval gate

- [ ] Human review of this plan
- [ ] OpenAPI shape sign-off
- [ ] `current_phase` PHASE-3 authorization (after BLK-001 staging proof)
- [ ] Implementation agent assigned with frozen `owned_paths`

**Do not implement until explicit approval.**
