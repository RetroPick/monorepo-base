# Verification Evidence — MKT-P1-009

## Task ID

MKT-P1-009 — Observability baseline

## Date / agent

2026-08-09 / Chat K (MKT-P1-010 exit gate aggregation)

## Environment

- Branch: `main`
- Commit: `a5ffb0108f777a1a7afb9b605ca82dbdd3ecb8fd`

## Commands executed

```bash
export PATH="/usr/local/go/bin:$PATH"
cd apps/backend
go test ./internal/markets/ -run 'TestMetricsExposeBoundedPrometheusSeries|TestMetricsIgnoreUnknownLabelValues' -count=1 -v
go test ./internal/markets/syncworker/ -run 'TestObserveSyncRunRecordsMetrics|TestClassifyGammaErrorKind' -count=1 -v
# Live scrape (best-effort):
curl -s localhost:8080/metrics | rg 'retropick_markets_(catalog_freshness|books_total|upstream_requests_total|gamma_errors_total|catalog_last_success)'
```

## Results

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| `TestMetricsExposeBoundedPrometheusSeries` | Pass | All required Prometheus lines present |
| `TestMetricsIgnoreUnknownLabelValues` | Pass | Cardinality bound enforced |
| `TestObserveSyncRunRecordsMetrics` | Pass | Gamma sync success + error paths |
| `TestClassifyGammaErrorKind` | Pass | Error kind mapping |
| Live `/metrics` scrape | N/A | markets-api not running on `:8080` at verification time |
| `GET /metrics` wired in `markets-api/main.go` | Pass | Code review — endpoint registered |

## Prometheus series verified (unit test)

- `retropick_markets_upstream_requests_total{upstream="gamma",result="ok|error"}`
- `retropick_markets_upstream_requests_total{upstream="clob",result="ok"}`
- `retropick_markets_catalog_records_processed_total`
- `retropick_markets_catalog_last_success_timestamp_seconds`
- `retropick_markets_catalog_freshness_seconds_{sum,count}`
- `retropick_markets_catalog_freshness_within_slo_total`
- `retropick_markets_gamma_errors_total{kind="rate_limited"}`
- `retropick_markets_books_total{state="stale|resyncing"}`
- `retropick_markets_signals_total{result="created"}`

## Wiring evidence

- `service.go`: `observeCatalogFreshness` → `Metrics.ObserveCatalogFreshness`
- `syncworker/worker.go`: `observeSyncRun` after catalog sync
- `cmd/markets-api/main.go`: `NewResilientClient`, metrics passed to sync worker, `/metrics` exposed

## Ops note

Set `MARKETS_BOOK_MAX_AGE=5s` in staging/prod for P1-006 staleness SLO alignment (default remains `10s` in config tests).

## Sign-off

- [x] Acceptance criteria met
- [x] No secrets in artifact
