# SM-I-001 — Whale Trade Feed evidence

**Task:** Smart Money I1 / SM-I-001  
**Date:** 2026-08-10  
**Authority:** [.dev/markets-v1/intelligence/01_WHALE_TRADE_FEED.md](../../intelligence/01_WHALE_TRADE_FEED.md)

## Scope note

This work satisfies **SM-I-001** on the Smart Money I1 track. It is **not** a PHASE-4 portfolio exit gate (see [PHASE-4 doc](../../phases/PHASE-4-PORTFOLIO-REDEMPTION-AND-WITHDRAWAL.md) ownership annotation).

## Deliverables

| Area | Path |
|------|------|
| Intelligence runtime | `apps/backend/internal/markets/intelligence/` |
| OpenAPI v1.4.0 | `schemas/openapi/markets-v1.yaml` — `GET /markets/intelligence/whales` |
| Golden vectors | `.dev/markets-v1/intelligence/testdata/whale_feed_vectors.yaml` |
| Feature flag | `MARKETS_INTELLIGENCE_WHALE_FEED_ENABLED` (default **off**) |
| Capabilities | `features.intelligence_whale_feed` |

## Commands and results

```bash
cd apps/backend
go test ./internal/markets/intelligence/... -count=1
# ok (all packages)

go test ./internal/markets/... -count=1
# ok (all markets packages)

rg -n "autoCopy|auto_copy|PLACE_ORDER|/markets/copy" apps/backend/internal/markets/intelligence/
# no matches
```

## Acceptance mapping (01_WHALE_TRADE_FEED §13)

| Criterion | Evidence |
|-----------|----------|
| Wallet only from Data `/trades` shape | `model.NormalizedTrade.Validate()` rejects non-`data_trades` source; module test |
| τ_market + weights 0.40/0.35/0.25 | `params/intelligence_params_v1.yaml` + `params_test.go` |
| Launch path without wallet_prior / timing_novelty | Classifier uses three components only |
| Dedup fingerprint + idempotent re-ingest | `whale/fingerprint.go`, ingest + module e2e test |
| `GET /markets/intelligence/whales` + OpenAPI | conformance test `whales disabled` |
| In-memory `intel_trades` / `intel_whale_events` | `store/memory.go` |
| Flag `intelligence.whale_feed` default off | config default `0`; disabled response `feature_disabled` |
| Golden vectors WHALE_* | `whale/classifier_test.go` + updated YAML |
| No auto-copy / insider labels | security grep clean; WHALE_* reason codes only |

## Lag honesty

Feed items expose `lagSeconds`, `freshness`, `provenance.source=data_trades`, and `source=data_trades` on each card. No sub-second realtime claims.

## Follow-ups (out of scope)

- Postgres `intel_*` migrations (I0 / be-data)
- fe-v1 whale feed UI
- Live Data API poller in default dev (FixtureClient / manual ingest for tests)
