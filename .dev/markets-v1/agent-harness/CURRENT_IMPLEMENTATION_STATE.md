# Current Implementation State — Phase 1.2

- **Branch:** `cursor/markets-v1-phase1-2-web-read-terminal-fb73`
- **Base merge SHA (PR #7):** `3febd9eeb5ee203e348e33c2373ab37348cabba9`
- **Phase:** 1.2 — Mobile-first web read terminal + Builder V2 architecture freeze
- **Status:** `implementation_in_progress`

## Delivered in Phase 1.2

| Task | Outcome |
|------|---------|
| P1W-000 | `docs/architecture/markets-web-read-terminal.md` |
| P1W-001 | OpenAPI → TypeScript generation + CI drift gate |
| P1W-002 | `@retropick/polymarket` MarketsClient with tests |
| P1W-003 | TanStack Query layer with bounded stale/poll policy |
| P1W-004–007 | Mobile shell, discovery, event/market detail, freshness UX |
| P1W-008 | `docs/architecture/polymarket-builder-v2-integration.md` |
| P1W-009–012 | Security review in arch docs; unit/contract tests; CI gate |

## Capability honesty

- `capabilities.trading=false` — disabled trade CTA
- `capabilities.features.realtime=false` — polling labeled as snapshot, not realtime
- Portfolio nav disabled with explicit future-phase label
- Signals nav gated on `intelligence` capability

## Verification

```bash
bash scripts/check-markets-openapi-drift.sh
pnpm --filter @retropick/polymarket test
pnpm --filter web test
go -C apps/backend test ./internal/markets/... -count=1
```

**Graphify:** `SKIPPED_NOT_ENFORCED` when CLI unavailable locally; CI runs `scripts/check-graphify-freshness.sh`.

## Next action

Human review of draft PR; Phase 1.3 realtime producer + WebSocket bridge.
