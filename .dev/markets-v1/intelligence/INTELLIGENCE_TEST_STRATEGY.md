# Intelligence Test Strategy — Smart Money Launch V1

**Status:** active
**Owner:** intelligence-lead
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** Smart Money Intelligence Launch V1

---

## Description

This document is the **test strategy authority** for Smart Money Intelligence Launch V1. It defines the pyramid (unit formulas → contract → integration poller→projection→API → golden YAML → E2E fe states → failure/stale/429 → security), per-feature acceptance ID patterns, and pointers to [testdata/](testdata/) fixtures.

Goals: deterministic metrics, honest lag, no order path from intelligence, follow privacy, and CI-lockable golden vectors **outside** Markdown. Feature docs `01`–`10` reference this strategy rather than embedding hundreds of synthetic rows.

Align with Markets backend testing norms ([BACKEND_TEST_STRATEGY.md](../backend/BACKEND_TEST_STRATEGY.md)) but scope assertions to SM-I-* Launch capabilities.

---

## 0. Developer intent (5W+1H)

| Lens | Answer |
|------|--------|
| **Who** | Intelligence/BFF engineers; `qa-integration`; fe-markets E2E authors; security reviewers; agents marking harness tasks done. |
| **What** | Pyramid, environments, golden fixture contract, acceptance ID scheme `SM-I-00N-AC-###`, failure/security suites, mapping to testdata files. |
| **When** | Every PR touching intelligence modules, OpenAPI intel paths, or formula versions; before claiming SM-I feature complete. |
| **Where** | Tests colocated under `apps/backend/internal/markets/intelligence/...` (when implemented); fixtures in `.dev/markets-v1/intelligence/testdata/`; OpenAPI `schemas/openapi/markets-v1.yaml`; fe E2E under fe-v1 conventions. |
| **Why** | Wrong P&L or WS-invented wallets destroy trust; auto-copy regressions are SEV-class; stale/429 must degrade readably without fabricating trades. |
| **How** | Lock formulas with YAML goldens; contract-test OpenAPI; integration-test ingest idempotency; E2E PUBLIC vs ACCOUNT gates; security tests forbid order path + follow leakage. |

### Worked example

**Happy path.** PR changes `large_trade_v1` threshold → update `testdata/whale_feed_vectors.yaml` + unit test → integration proves upsert idempotency → contract examples match BFF JSON → fe shows stale banner on fixture freshness flag.

**Failure / Never.** Weakening goldens to match buggy math. E2E that auto-submits orders from alerts. Skipping authz on follows. Claiming SM-I-004 done without `wallet_performance_vectors.yaml` green.

---

## 1. Pyramid

```text
            E2E fe states
         Failure / stale / 429
        Security (authz / no order)
       Integration poller→projection→API
      Contract OpenAPI + fixtures
     Golden testdata/*.yaml
    Unit formulas / pure functions
```

| Layer | Scope | Proof |
|-------|-------|-------|
| **Unit** | `large_trade_v1`, `roi_v1`, `win_rate_v1`, `smart_money_v1`, `paper_fill_v1`, `backtest_v1` | Pure Go tests + YAML vectors |
| **Golden** | Cross-fixture expected outputs | `testdata/*.yaml` |
| **Contract** | OpenAPI intel paths, error envelopes, Money BIGINT/strings | `contract_test.go` + examples |
| **Integration** | Poller/adapter mock → DB projections → BFF handlers | testcontainers PG |
| **E2E** | fe PUBLIC browse + ACCOUNT flows | Playwright (or project standard) |
| **Failure** | Upstream 429/5xx, stale freshness, empty holders | Degraded UX assertions |
| **Security** | Authz, follow privacy, no order path, no autoCopy | CI greps + negative tests |

---

## 2. Environments

| Env | Upstream | DB | Use |
|-----|----------|----|-----|
| local | fixtures / wiremock | docker PG | Dev loop |
| CI | wiremock + YAML | ephemeral PG | PR gate |
| staging | Polymarket public read (budgeted) | staging PG | Lag realism |
| prod | live | live | Metrics only — not functional “test” |

Do not burn production rate-limit budget from CI.

---

## 3. Golden testdata files

| File | Feature | Vector themes |
|------|---------|---------------|
| [testdata/whale_feed_vectors.yaml](testdata/whale_feed_vectors.yaml) | SM-I-001 | Threshold hit/miss, dedupe, reason codes |
| [testdata/wallet_performance_vectors.yaml](testdata/wallet_performance_vectors.yaml) | SM-I-004 | Realized/unrealized, ROI denominator, shrink win rate |
| [testdata/smart_money_vectors.yaml](testdata/smart_money_vectors.yaml) | SM-I-005 | Sample floor, ranking stability, version bump |
| [testdata/backtest_vectors.yaml](testdata/backtest_vectors.yaml) | SM-I-010 | No look-ahead, bounded window, reject oversized |
| [testdata/paper_copy_vectors.yaml](testdata/paper_copy_vectors.yaml) | SM-I-009 | Idempotent fills, equity update, simulation only |

### 3.1 Vector record shape

Each case SHOULD include:

```yaml
id: whale_feed_001
version: large_trade_v1
feature: SM-I-001
input: { ... }
expected: { ... }
reason: "..."
edge_case: false
```

Markdown feature docs link here; they do not duplicate bulk rows.

---

## 4. Per-feature acceptance ID pattern

Pattern:

```text
SM-I-00N-AC-###
```

| Segment | Meaning |
|---------|---------|
| `SM-I-00N` | Launch requirement (001…010) |
| `AC` | Acceptance criterion |
| `###` | Zero-padded sequence within feature |

### 4.1 Seed acceptance catalog (non-exhaustive)

| ID | Criterion |
|----|-----------|
| SM-I-001-AC-001 | Feed items only from wallet-attributed Data trades |
| SM-I-001-AC-002 | Re-ingest same upstream trade does not duplicate event |
| SM-I-001-AC-003 | Response includes freshness / lag fields |
| SM-I-001-AC-004 | Envelope present with reasonCodes |
| SM-I-002-AC-001 | Exact address lookup returns profile or typed not_found |
| SM-I-002-AC-002 | Username search respects rate-limit/cache; no deanonymization fields |
| SM-I-003-AC-001 | Profile labels upstream vs derived fields |
| SM-I-004-AC-001 | Golden P&L vectors match BIGINT outputs |
| SM-I-004-AC-002 | Win-rate observation unit is resolved position/event — not raw fill spam |
| SM-I-005-AC-001 | Wallets below `n_min` excluded or flagged |
| SM-I-005-AC-002 | No insider labels in API/UI |
| SM-I-006-AC-001 | Follow requires auth; list not public |
| SM-I-006-AC-002 | Unfollow is idempotent |
| SM-I-007-AC-001 | Holders length ≤ 20; no padded ranks |
| SM-I-008-AC-001 | Alert action is VIEW_MARKET only |
| SM-I-008-AC-002 | Delivery dedupe key prevents double push |
| SM-I-009-AC-001 | Paper fill idempotent on source_event_id |
| SM-I-009-AC-002 | No CLOB submit client/server calls in paper path |
| SM-I-010-AC-001 | Backtest refuses look-ahead price usage (fixture) |
| SM-I-010-AC-002 | Oversized window rejected/degraded with typed error |

Feature docs may extend `AC-###` sequences; IDs must remain unique.

---

## 5. Layer requirements by concern

### 5.1 Unit — formulas

- Pure functions over fixtures; no network.
- Version string asserted (`roi_v1`, etc.).
- Property checks where cheap (e.g. realized + unrealized consistency invariants).

### 5.2 Contract — OpenAPI + fixtures

- Every intel path has examples.
- Money fields conform to Markets Money rules.
- Error taxonomy includes `rate_limited`, `stale`, `not_found`, `auth_required`.
- `capabilities.autoCopy` must be absent/false; no copy-submit paths.

### 5.3 Integration — poller → projection → API

Minimum pipeline test:

1. Load mock Data `/trades` page.
2. Run TradeIngestor + WhaleClassifier.
3. Assert `intel_trades` / `intel_whale_events` row counts.
4. GET BFF whales → JSON matches contract.
5. Re-run ingest → counts unchanged (idempotency).

Similar pipes for holders refresh, metrics recompute, paper fill, backtest job.

### 5.4 E2E — fe states

| State | Assert |
|-------|--------|
| loading | skeleton/spinner |
| ready | cards/tables render |
| empty | explicit empty |
| stale | banner; no fake “live” |
| error / rate limited | retry/degraded copy |
| auth gated | ACCOUNT features redirect/sign-in |

PUBLIC pages usable logged-out. ACCOUNT flows blocked logged-out.

### 5.5 Failure — stale / 429

| Injection | Expected |
|-----------|----------|
| Adapter 429 | backoff; serve last projection; freshness=stale |
| Upstream 5xx | degraded banner; no fabricated trades |
| Empty holders | empty list, not synthetic wallets |
| Envelope stale threshold | lifecycle `stale` surfaced |

### 5.6 Security

| Case | Expected |
|------|----------|
| Unauth GET follows | 401/403 |
| User A reads User B follows | denied |
| Alert payload | no pre-signed order; action VIEW_MARKET |
| Paper/backtest workers | zero calls to order submit |
| CI grep | `autoCopy`, `PLACE_ORDER` from intel alert paths forbidden |
| fe bundle | no `data-api.polymarket.com` production calls |

---

## 6. CI gates (target)

When implementation exists:

- Unit + golden vector tests for formulas
- `go test` intelligence packages
- OpenAPI spectral + contract tests for intel paths
- Integration idempotency suite
- Security negative tests / greps
- Optional: fe E2E smoke for whales + gated follow

Do not mark SM-I tasks complete on wiring alone.

---

## 7. Mapping to micro-phases

| Micro-phase | Test focus |
|-------------|------------|
| I0 | Adapter contract fixtures, idempotency keys, envelope schema |
| I1 | Whale goldens + feed contract + lag fields |
| I2 | Search/profile/performance goldens |
| I3 | Leaderboard + holders caps |
| I4 | Authz follows/alerts; dedupe |
| I5 | Backtest look-ahead suite |
| I6 | Paper ledger idempotency + no-order-path |

---

## 8. Cross-references

- [testdata/](testdata/)
- [INTELLIGENCE_LAUNCH_V1.md](INTELLIGENCE_LAUNCH_V1.md)
- [INTELLIGENCE_DATA_MODEL.md](INTELLIGENCE_DATA_MODEL.md)
- [INTELLIGENCE_C4_MODEL.md](INTELLIGENCE_C4_MODEL.md)
- [BACKEND_TEST_STRATEGY.md](../backend/BACKEND_TEST_STRATEGY.md)
- [ADR-009](../architecture/adr/ADR-009-NO-AUTO-COPY-TRADING-V1.md)
