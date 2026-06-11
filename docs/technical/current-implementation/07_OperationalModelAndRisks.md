# 07 Operational Model And Risks

> **Deploy policy:** [`PRODUCTION.md`](../../../PRODUCTION.md). **Backend runbook:** [`.dev/backend/operations-runbook.md`](../../../.dev/backend/operations-runbook.md).

## Operational Model

## Core Services
- **API**: serves read/write HTTP endpoints and websocket fanout.
- **Indexer**: ingests chain logs and refreshes projections.
- **Migrator**: applies schema changes.
- **Postgres**: canonical off-chain store for events, projections, and funding lifecycle state.

## Startup Dependencies
- Valid config + registry.
- RPC connectivity to target chain.
- Postgres reachable with schema present.
- For relay-enabled faucet paths: funded relayer key and proper chain alignment.

## Runtime Health Signals
- Health/readiness endpoints from API.
- `indexer_state` progression (`last_block`, `last_indexed_at`, block hash continuity).
- WS stream quality (sequence progression, replay success, reconnection behavior).
- Funding worker throughput (destination polling, matching, crediting).

## Failure/Recovery Patterns
- **Reorg**: indexer rewinds/truncates projections and rebuilds from canonical events.
- **WS sequence gap**: frontend receives `resync_required` and refetches.
- **Funding execution drift**: worker pipeline attempts reconciliation from destination transfers and execution metadata.
- **Rolling market halt** (on-chain): operational process must run explicit recovery sequence before re-entering live rolling.

## Known Risks and Gaps
- Mixed auth strictness across wallet-scoped endpoints can create security ambiguity if not gated externally.
- Funding v1 and v2 coexistence increases maintenance and integration complexity.
- Matcher heuristics in funding pipeline can be ambiguous under high concurrency without strong tx linkage.
- In-memory rate-limit style controls do not automatically coordinate across horizontally scaled replicas.
- Some binaries are placeholders and should not be mistaken for complete automation services.
- Hybrid Next shell + client-router app can cause ownership confusion unless documented for maintainers.

## Assumptions
- Smart contract lifecycle semantics in `currentSmartContract.md` remain canonical for settlement logic.
- Backend projection schema remains consistent with indexer event handlers.
- Frontend relies on typed API contract and realtime invalidation rather than direct chain polling for most UX.

## Recommended Operational Guardrails
- Enforce strict CORS/auth configuration per environment.
- Monitor indexer lag and chain continuity metrics as first-class SLO indicators.
- Track funding intent/execution transitions for stuck-state detection.
- Keep contract registry and ABI artifacts versioned with deployment changes.
- Document deprecation path for legacy funding endpoints to reduce interface ambiguity over time.
