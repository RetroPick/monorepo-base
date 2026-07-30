# Current Implementation State

- **Branch:** `cursor/markets-v1-backend-phase1-5b74`
- **Starting HEAD:** `bf269210772b07764ac02a60eff1ca91deae6d4f`
- **Authorized phase:** PHASE-1 backend-first read-market slice
- **Reconciliation:** `PASS_WITH_FOCUSED_ADR` via ADR-010
- **Current task:** MKT-P1-007 — Realtime client envelope
- **Completed tasks:** MKT-P1-000 reconciliation; MKT-P1-001 canonical
  OpenAPI and Go domain contracts; MKT-P1-002 Gamma and CLOB public-read
  anti-corruption clients; MKT-P1-003 additive migration 000016, sqlc queries,
  and PostgreSQL repository; MKT-P1-004 bounded catalog mapping, rule hashes,
  raw evidence, and atomic checkpoint application; MKT-P1-005 exact order-book,
  history, freshness, hash-gap resync, and health components; MKT-P1-006
  contract-first public read handlers, structured errors, caching policy, and
  official host configuration
- **Owned paths:** `schemas/openapi/markets-v1.yaml`,
  `apps/backend/internal/markets/`, `apps/backend/migrations/`,
  `apps/backend/sql/`, related generated queries and Markets V1 harness docs
- **Decisions:** preserve Go modular monolith and PostgreSQL; use direct official
  public APIs behind owned adapters; use snapshot hash/time resync rather than
  undocumented sequence guarantees; no web, Android, trading, custody, or PRISM
- **Commands/tests run:** `go test ./internal/markets/... -count=1`;
  `go test ./internal/markets/gamma ./internal/markets/clob -count=1` from
  `apps/backend`; `go test ./internal/markets/postgres ./migrations -count=1`;
  sqlc 1.28 drift check (pass after expected TDD red runs; DB-backed test bodies
  skipped because `DATABASE_URL` is unavailable); catalog and full Markets
  package suites pass; market-data consistency suite passes
- **Active blockers:** none for the authorized public-read slice
- **Next exact action:** define failing realtime envelope, schema-version,
  snapshot-hash gap, disconnect, and resynchronization tests
