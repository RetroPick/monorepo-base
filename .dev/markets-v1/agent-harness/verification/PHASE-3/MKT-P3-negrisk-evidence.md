# MKT-P3-008 — Neg Risk routing golden vectors — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-008 / MKT-POLY-003  
**Approval:** User approved plan in chat (2026-08-09); `current_phase` **not** advanced.

## Summary

Implemented BFF ACL Neg Risk exchange routing in `orders/negrisk.go`: CLOB `neg_risk` authoritative when book available, catalog `capabilities.negRisk` fallback when book unavailable, fail-closed on book/catalog mismatch. Golden vectors in `testdata/negrisk_routing_vectors.yaml` lock domain + EV-008 `verifyingContract` pins. Preview wired via `SelectExchangeDomain`; CLOB submit remains domain-agnostic (`clob/negrisk.go` documents parity only).

**ADR-002:** routing logic stays in `internal/markets/orders/`; clients unchanged.

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/backend && go test ./internal/markets/orders/... -count=1 -run 'NegRisk\|Golden\|Preview_Exchange\|SelectExchange'` | Pass |
| `cd apps/backend && go test ./internal/markets/clob/... -count=1 -run NegRisk` | Pass |
| `cd apps/backend && go test ./internal/markets/... -count=1` | Pass |
| `cd apps/backend && go build -o /dev/null ./cmd/markets-api/` | Pass |
| `graphify update .` | Pass |

## Acceptance criteria (MKT-POLY-003 / NEGATIVE_RISK §0)

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Standard market → `exchangeDomain: standard` + CTF Exchange V2 | Vector `routing_standard_clob_false`; `TestPreview_MisleadingTitleIgnored` |
| 2 | `negRisk: true` (CLOB) → `exchangeDomain: neg_risk` + Neg Risk Exchange | Vector `routing_neg_risk_clob_true`; `TestPreview_ExchangeDomainNegRisk` |
| 3 | Title/question heuristics not used | Vector `routing_title_noise_ignored`; `ExchangeRoutingInput` has no title fields |
| 4 | Book/catalog mismatch fail-closed | Vector `routing_book_catalog_mismatch`; `TestPreview_ExchangeRoutingConflict` |
| 5 | Catalog fallback when book unavailable | Vectors `routing_catalog_fallback_*`; `TestPreview_ExchangeDomainCatalogFallback` |
| 6 | ADR-002 ACL ownership | `orders/negrisk.go`; no web/OpenAPI/catalog ingest changes |
| 7 | MKT-P3-006 market-health dashboard not implemented | No health metrics/routes added |

## EV-008 registry parity (web)

| Domain | BFF (`orders/negrisk.go`) | Web (`exchangeRegistry.ts`) |
|--------|---------------------------|-----------------------------|
| `standard` | `0xe111180000d2663c0091e4f400237545b87b996b` | `0xE111180000d2663C0091e4f400237545B87B996B` |
| `neg_risk` | `0xe2222d279d744050d28e00520010520000310f59` | `0xe2222d279d744050d28e00520010520000310F59` |

EIP-712: `name: Polymarket CTF Exchange`, `version: 2`, `chainId: 137`.

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/orders/negrisk.go` | **New** — `SelectExchangeDomain`, EV-008 constants |
| `apps/backend/internal/markets/orders/negrisk_test.go` | **New** — golden vectors + preview integration tests |
| `apps/backend/internal/markets/orders/testdata/negrisk_routing_vectors.yaml` | **New** — MKT-POLY-003 routing vectors |
| `apps/backend/internal/markets/orders/preview.go` | Wire `SelectExchangeDomain` (book + catalog) |
| `apps/backend/internal/markets/orders/errors.go` | `ErrExchangeRoutingConflict` |
| `apps/backend/internal/markets/orders/handler.go` | Map routing conflict → 502 `upstream_unavailable` |
| `apps/backend/internal/markets/orders/preview_test.go` | `stubBookConstraints.negRisk` field |
| `apps/backend/internal/markets/clob/negrisk.go` | **New** — parity constants + doc |
| `apps/backend/internal/markets/clob/negrisk_test.go` | **New** — BFF/clob address parity test |

## Invariant greps

```text
rg -n 'question|title|slug' apps/backend/internal/markets/orders/negrisk.go
# (no matches — routing uses upstream flags only)

rg -n '0xe2222' apps/backend/internal/markets/orders/
# negrisk.go, testdata/negrisk_routing_vectors.yaml
```

## Explicit non-claims

- No market-health dashboard (MKT-P3-006 archived)
- No neg-risk convert / relayer (V1.1)
- No startup bytecode registry probe
- No mainnet order acceptance
- No `current_phase` advance
- No web/Android/OpenAPI edits

## Handoff

- **MKT-P3-009:** Web E2E can assert neg-risk preview `exchangeDomain` + client `buildOrderTypedData` contract pin on staging fixtures.
- **Future registry task:** startup bytecode verify for EV-008 addresses (out of MKT-P3-008 scope).

## Sign-off

- [x] Golden vectors green
- [x] Preview integration tests green
- [x] Full `internal/markets/...` test suite green
- [x] BFF ↔ web registry parity documented
- [ ] Staging neg-risk market preview E2E (requires BLK-001 + live catalog)
