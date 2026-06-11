# Epoch field parity (indexer → API → fe-v1)

Single source of truth for **active epoch lifecycle** on the indexed path is `market_snapshots.status`, written by **`be-indexer`** from on-chain epoch events (`open` → `locked` → `resolved`). The `epochs` table carries the same string in `epochs.status` for SQL joins and `GET .../epochs`.

## Event → projection → JSON

1. **Chain logs** → `chain_events` (indexer ingest).
2. **Indexer handlers** (`internal/indexer/indexer.go`) call `initializeProjection` / `updateSnapshotStatus` with literals `"open"`, `"locked"`, `"resolved"`.
3. **`market_snapshots`** row per `template_id`: `active_epoch_id`, `status`, pools, `last_indexed_block`.
4. **REST list** `GET /api/v1/markets`: merges `ListTemplatesWithLedger` with `marketdata.ProjectionSnapshot`; when a snapshot exists, response includes:
   - `status` — projection epoch status (legacy wire name, same as snapshot).
   - **`epochStatus`** — duplicate of `status` for explicit clients (preferred in new TS code).
5. **REST detail** `GET /api/v1/markets/{templateId}`: when `GetProjectionSnapshot` succeeds, sets `status` and **`epochStatus`**; `activeEpoch.status` still comes from **`epochs`** via `GetEpoch`.
6. **Realtime** `projectionPayload` includes `status`; WS clients should treat it as epoch projection status (merged into TanStack cache as `epochStatus` in `useIndexerWebSocket`).

## fe-v1 usage

- **`fetchMarkets`** maps wire `status` → `MarketRow.epochStatus` so list rows always use one field.
- **`inferMarketCardLifecycle`** (`chainDiscover.ts`) maps `epochStatus` to card tokens **`open` | `lock` | `resolve`**; if `activeEpochId` is set but projection status is missing, the card uses **`syncing`** (no invented “open”).
- **Discover copy** uses engine-oriented tokens; **rolling** markets still use `rollingPhase` / `rollingHaltReason` from `templates` (MarketEngine rolling state), which is orthogonal to per-epoch `open`/`locked`/`resolved`.

## Related

- HTTP route map: [`code/api/http-surface.md`](./code/api/http-surface.md)
- Operator workflow: [`../../docs/feature/ops-admin-operator-workflow.md`](../../docs/feature/ops-admin-operator-workflow.md)
