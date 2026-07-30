# Current Implementation State

- **Branch:** `cursor/markets-v1-backend-phase1-5b74`
- **Starting HEAD:** `bf269210772b07764ac02a60eff1ca91deae6d4f`
- **Authorized phase:** PHASE-1 backend-first read-market slice
- **Reconciliation:** `PASS_WITH_FOCUSED_ADR` via ADR-010
- **Current task:** MKT-P1-000 — reconciliation and implementation preflight
- **Completed tasks:** none
- **Owned paths:** `schemas/openapi/markets-v1.yaml`,
  `apps/backend/internal/markets/`, `apps/backend/migrations/`,
  `apps/backend/sql/`, related generated queries and Markets V1 harness docs
- **Decisions:** preserve Go modular monolith and PostgreSQL; use direct official
  public APIs behind owned adapters; use snapshot hash/time resync rather than
  undocumented sequence guarantees; no web, Android, trading, custody, or PRISM
- **Commands/tests run:** repository status and architecture discovery only;
  pre-existing Markets compile failure recorded in reconciliation report
- **Active blockers:** none for the authorized public-read slice
- **Next exact action:** define failing contract/domain tests for MKT-P1-001
