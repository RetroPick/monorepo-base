# DATABASE AND MIGRATIONS

**Status:** reviewed
**Owner:** platform-orchestrator
**Last updated:** 2026-08-09
**Product:** RetroPick Markets V1
**Wave:** 3 — Backend architecture and API contracts

## Description

This document is the authority for the PostgreSQL **`markets.*` schema and migrations** in RetroPick Markets V1. It defines conventions (UUID v7 PKs, `BIGINT` money base units, `NUMERIC`/`DecimalString` prices, `TIMESTAMPTZ` UTC, UNIQUE(`upstream_source`,`upstream_id`)), ER relationships, per-table field specs, indices, and expand-contract migration strategy—so projections stay replayable and idempotent against venue/chain truth without inventing ad-hoc tables outside `markets`.

It sits in Wave 3 beside service boundaries, domain state machines, and indexing/reorg specs. Migrations live under `apps/backend/migrations/markets/` with sqlc-generated store code. Immutable `raw_upstream_events` enable re-projection after bugs or reorgs; `position_projections` / fills are derived and repaired via reconciliation—not user-edited truth. No floating point for money. CI must exercise up/down on ephemeral DB.

Read this before any DDL, sqlc query, or store method that persists Markets state. Prefer sibling docs for who owns each table and status transition meaning—not for column/index conventions.

## 0. Developer intent (5W+1H)

Short orientation for implementers and agents. Read this before the normative sections below.

| Lens | Answer |
|------|--------|
| **Who** | `be-data` / platform-backend owning migrations and sqlc under `apps/backend/migrations/markets/` and `internal/markets/store`; ingest/reconcile/signal workers writing projections; API handlers reading catalog, orders, positions, intelligence tables; reviewers of expand-contract DDL. |
| **What** | PostgreSQL schema `markets.*`: conventions (UUID v7 PKs, `BIGINT` money base units + currency/decimals, `NUMERIC(38,18)` or `DecimalString` prices, `TIMESTAMPTZ` UTC, UNIQUE(`upstream_source`,`upstream_id`)), ER relationships, per-table field specs, indices, retention pointers, and migration strategy (`golang-migrate`/`goose`, expand-contract, CI up/down). Tables cover catalog, market data, orders/attempts/fills, wallets, funding/withdrawals, position/redemption **projections**, chain_events, sync_checkpoints, raw_upstream_events, signals/evidence/retractions, alerts, watchlists, wallet profiles, reconciliation_runs, eligibility_decisions, notifications, builder_fee_versions, execution_quality, trade_journal. |
| **When** | Before any DDL, sqlc query, or store method that persists Markets state. When adding a phase feature that needs a new relation, add migration here first—do not invent ad-hoc tables outside `markets`. Backfills are separate worker tasks, not sneaky app writes. |
| **Where** | Spec: this file. Code: `apps/backend/migrations/markets/YYYYMMDDHHMMSS_*.{up,down}.sql` + sqlc-generated store. Consumers by ownership: [SERVICE_AND_MODULE_BOUNDARIES.md](./SERVICE_AND_MODULE_BOUNDARIES.md). Domain meaning of statuses: [DOMAIN_MODEL_AND_STATE_MACHINES.md](./DOMAIN_MODEL_AND_STATE_MACHINES.md). Chain cursor tables used by [INDEXING_RECONCILIATION_AND_REORGS.md](./INDEXING_RECONCILIATION_AND_REORGS.md). |
| **Why** | Projections must be replayable and idempotent against venue/chain truth. Upstream natural keys prevent double catalog/trade rows. Fixed-point money avoids float corruption in balances and notionals. Zero-downtime expand-contract keeps API deployable while columns land. Separating `raw_upstream_events` (immutable) from normalized tables enables re-projection after bugs or reorgs. |
| **How** | New table/column: write up+down migration, update sqlc, keep UNIQUE upstream tuples, CHECK/app enums for status, never `float`/`double` for money. Use `payload_json` only for normalized upstream slices that are not yet first-class columns—promote carefully. Indices: upstream tuple + status/time as baseline. Roll migrations in CI on ephemeral DB; backfill via worker with checkpoint. Treat `position_projections` / `redemption_projections` / fills as derived—repair via reconciliation, not user-edited truth. |

### Worked example

**Happy path — catalog market row.** Ingest validates Gamma payload, INSERT into `raw_upstream_events`, UPSERT `catalog_markets` keyed by (`upstream_source`,`upstream_id`) with `observed_at`, `status`, and normalized `payload_json` / promoted columns. Related `catalog_outcomes` share the same provenance pattern. API list/detail read these projections; money fields on funding/order tables use `BIGINT` amount + currency/decimals metadata (never float).

**Happy path — order + fill projection.** Submit path inserts `markets_user_orders` / `markets_order_attempts` with venue ids when known. Preview bind uses `markets_order_previews` (TTL + `consumed_at`). Fill reconcile UPSERTs `markets_fills` by upstream trade identity and updates order status. `position_projections` refresh from CLOB+chain—still marked as projections in naming and in API semantics.

**Failure / migration edge.** Dropping a column still read by old replicas violates expand-contract—add → dual-write/read → remove later. Duplicate upstream id hits UNIQUE → idempotent upsert, not a second market. Float column for notional is rejected in review. Reorg deletes `chain_events` above `safe_block` and re-indexes; dependent projections rebuild via reconciliation, not invented SQL balances. Failed migration down path must be CI-tested.

### Schema conventions (enforce in every migration)

- Schema name: `markets`
- PK: UUID v7 (`id`)
- Money: `BIGINT` base units + `currency` / `decimals`
- Prices: `NUMERIC(38,18)` and/or transport as `DecimalString`
- Timestamps: `TIMESTAMPTZ` UTC
- Upstream identity: UNIQUE(`upstream_source`, `upstream_id`)
- Tooling: `golang-migrate` or `goose` under `apps/backend/migrations/markets/`
- Naming: `YYYYMMDDHHMMSS_description.up.sql` (+ matching `.down.sql`)

### Table families (ownership hint)

| Family | Examples | Typical writer |
|--------|----------|----------------|
| Catalog | `catalog_events`, `catalog_markets`, `catalog_outcomes`, … | markets-ingest |
| Market data | `market_data_*`, `raw_upstream_events` | markets-ingest |
| Trading | `orders`, `order_attempts`, `fills` | API + reconciliation |
| Wallet/funding | `wallet_accounts`, `funding_operations`, `withdrawal_operations` | API + partners |
| Portfolio | `position_projections`, `redemption_projections` | reconciliation |
| Chain | `chain_events`, `sync_checkpoints`, `reconciliation_runs` | ingest + reconcile |
| Intelligence | `market_signals`, `signal_evidence`, `signal_retractions`, wallet profiles | signal-engine |
| Alerts/UX | `alert_rules`, `alert_deliveries`, `notifications`, `watchlists` | alert-delivery / API |

### Implementer checklist

- sqlc regenerated after DDL; no hand-written SQL outside store package norms.
- Indices: upstream tuple + status/time baseline; add query-specific indexes with explain evidence.
- Backfills = worker tasks with checkpoints, not blocking migrate transactions.
- Retention policies live in platform docs—do not silently truncate audit/eligibility rows.

    ## 1. Purpose

    PostgreSQL `markets.*` schema: ER diagram, table specifications, indices, migrations.
    Per master prompt §9.1.

    ## 2. Schema conventions

    - Schema: `markets`
    - PK: UUID v7 (`id`)
    - Money: `BIGINT` base units + `currency` / `decimals` metadata
    - Prices: `NUMERIC(38,18)` or string transport via `DecimalString`
    - Timestamps: `TIMESTAMPTZ` UTC
    - Upstream tuple: UNIQUE(`upstream_source`, `upstream_id`)
    - No floating point for money

    ## 3. ER diagram

```mermaid
erDiagram
  catalog_events ||--o{ catalog_markets : contains
  catalog_markets ||--o{ catalog_outcomes : has
  catalog_markets ||--o{ market_data_orderbook_snapshots : snapshots
  catalog_markets ||--o{ market_data_trades : trades
  wallet_accounts ||--o{ orders : places
  orders ||--o{ order_attempts : attempts
  orders ||--o{ fills : generates
  wallet_accounts ||--o{ position_projections : holds
  wallet_accounts ||--o{ funding_operations : funds
  wallet_accounts ||--o{ withdrawal_operations : withdraws
  market_signals ||--o{ signal_evidence : evidences
  alert_rules ||--o{ alert_deliveries : delivers
  watchlists ||--o{ watchlist_items : items
  reconciliation_runs ||--o{ chain_events : validates
```

    ## 4. Migration strategy

    - Tool: `golang-migrate` embedded under [`apps/backend/migrations/`](../../../apps/backend/migrations/) (numbered `000NNN_description.up.sql`)
    - Naming: `000NNN_description.up.sql` (+ matching `.down.sql`)
    - Expand-contract for zero-downtime deploys
    - Backfill jobs as separate worker tasks
    - Rollback: down migrations tested in CI

    ## 4A. Phase-1 physical schema (MKT-P1-003)

    Phase-1 DDL lives in `public` with a `markets_` table prefix. Logical names in this doc (`markets.catalog_events`) map to physical tables as follows:

    | Logical | Physical table | Introduced |
    |---------|----------------|------------|
    | `markets.catalog_events` | `public.markets_catalog_events` | `000016` + expand `000019` |
    | `markets.catalog_markets` | `public.markets_catalog_markets` | `000016` + expand `000019` |
    | `markets.catalog_outcomes` | `public.markets_catalog_outcomes` | `000016` + expand `000019` |
    | `markets.catalog_market_rules` | `public.markets_catalog_rules` | `000016` + expand `000019` |
    | `markets.raw_upstream_events` | `public.markets_raw_upstream_events` | `000016` + expand `000019` |
    | `markets.sync_checkpoints` | `public.markets_sync_checkpoints` | `000016` + expand `000019` |
    | `markets.watchlists` | `public.markets_watchlists` | `000019` |
    | `markets.watchlist_items` | `public.markets_watchlist_items` | `000019` |

    A future contract migration may `CREATE SCHEMA markets` and rename/move tables; until then, consumers must use the physical names above.

    ### Three identity layers (catalog projections)

    | Layer | Column(s) | Role |
    |-------|-----------|------|
    | Surrogate row id | `id UUID NOT NULL` | Internal PK candidate; **application inserts MUST use UUID v7**. Migration `000019` backfills existing rows with `gen_random_uuid()` (dev-only convenience). |
    | Canonical API id | `event_id`, `market_id`, `outcome_id` | Stable RetroPick ids (`polymarket:event:{upstreamId}`, etc.); remain PRIMARY KEY in Phase-1 expand. |
    | Upstream tuple | `upstream_source`, `upstream_id` | Idempotent upsert key; `UNIQUE (upstream_source, upstream_id)` per catalog table. `upstream_source` mirrors legacy `source` / OpenAPI `UpstreamProvenance.source`. |

    **Backfill rules (`000019`):** events/markets strip `polymarket:{kind}:` prefix or read `payload->>'upstreamId'`; outcomes use `upstream_token_id`; rules inherit parent market tuple. Legacy `source` column retained until contract phase.

    ### Expand vs contract (000019)

    - **Expand (`000019`):** add `id`, `upstream_source`, `upstream_id`; create watchlist tables; keep TEXT PKs and FKs from `000016`.
    - **Contract (later):** promote `id` to PRIMARY KEY; drop redundant `source`; optional `markets` schema namespace; sqlc/store must lead.

    ### MKT-DATA-002 retention (Phase-1)

    - `markets_raw_upstream_events.expires_at` — rolling retention; partition/drop by policy.
    - `payload` / `snapshot` JSONB size CHECKs (`<= 1048576` bytes) on catalog and raw tables.
    - Parallel tuple on raw: `UNIQUE (upstream_source, upstream_id)` alongside legacy `UNIQUE (source, upstream_event_id)`.

    ### Exclusions (MKT-P1-003)

    - No `intel_*` tables (Intelligence I0 is a later phase).
    - Legacy epoch `user_watchlist` / `user_watchlist_nonce` unchanged (template_id BYTEA).
    - No binary-float money columns; Phase-1 catalog prices remain `TEXT` (`DecimalString`).

    ### Phase-1 watchlist DDL (`000019`)

    User-owned lists; private by default; no upstream tuple.

    **`public.markets_watchlists`**

    | Field | Type | Constraints | Notes |
    |-------|------|-------------|-------|
    | id | UUID | PK | App-supplied UUID v7 |
    | owner_wallet_address | TEXT | NOT NULL, lowercase CHECK | Auth subject; normalized `0x…` |
    | name | TEXT | NOT NULL DEFAULT `'default'` | Display name |
    | is_default | BOOLEAN | NOT NULL DEFAULT false | At most one `true` per owner (partial unique index) |
    | created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
    | updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

    **Indices:** `UNIQUE (owner_wallet_address, name)`; partial unique on `(owner_wallet_address) WHERE is_default`; index on `owner_wallet_address`.

    **`public.markets_watchlist_items`**

    | Field | Type | Constraints | Notes |
    |-------|------|-------------|-------|
    | id | UUID | PK | App-supplied UUID v7 |
    | watchlist_id | UUID | NOT NULL FK → watchlists | CASCADE delete |
    | item_kind | TEXT | NOT NULL CHECK | `event`, `market`, `wallet`, `tag`, `category` |
    | target_id | TEXT | NOT NULL | Canonical catalog id or wallet address |
    | sort_order | INT | NOT NULL DEFAULT 0 | Stable UI ordering |
    | created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

    **Indices:** `UNIQUE (watchlist_id, item_kind, target_id)`; `(watchlist_id, sort_order)`.

    ## 4B. Phase-3 trading DDL (MKT-P3 orders migration)

    Phase-3 trading tables live in `public` with a `markets_` prefix. Logical names in this doc map to physical tables as follows:

    | Logical | Physical table | Introduced |
    |---------|----------------|------------|
    | `markets.order_previews` | `public.markets_order_previews` | `000021` |
    | `markets.orders` | `public.markets_user_orders` | `000021` |
    | `markets.order_attempts` | `public.markets_order_attempts` | `000021` |
    | `markets.fills` | `public.markets_fills` | `000021` |

    Expand-only (`000021`): no `ALTER` on Phase-1/2 tables. PKs are app-supplied UUID v7. No binary-float money columns; prices/sizes use `TEXT` (`DecimalString`); fees use `BIGINT` base units + currency/decimals metadata. Order `status` includes `unknown` for submit-timeout reconcile (never auto-resubmit). Submit idempotency: `UNIQUE (idempotency_key)` on `markets_user_orders`.

    ### `markets.order_previews` (`markets_order_previews`)

    Short-lived preview binding for preview-before-sign (MKT-P3-001). Replaces in-memory preview store when sqlc wiring lands.

    | Field | Type | Constraints | Notes |
    |-------|------|-------------|-------|
    | id | UUID | PK | Same as API `previewId`; app-supplied UUID v7 |
    | user_id | TEXT | NOT NULL | Session subject |
    | market_id | TEXT | NOT NULL | Canonical `polymarket:market:{upstreamId}` |
    | token_id | TEXT | NOT NULL | Outcome CLOB token id |
    | side | TEXT | NOT NULL | CHECK ∈ `BUY`, `SELL` |
    | price | TEXT | NOT NULL | DecimalString |
    | size | TEXT | NOT NULL | DecimalString |
    | order_type | TEXT | NOT NULL DEFAULT `LIMIT` | CHECK ∈ `LIMIT` |
    | time_in_force | TEXT | NULL | CHECK ∈ `GTC`, `GTD` when set |
    | maker_address | TEXT | NOT NULL | Lowercase `0x` + 40 hex; CHECK |
    | signer_address | TEXT | NOT NULL | Lowercase `0x` + 40 hex; CHECK |
    | exchange_domain | TEXT | NOT NULL | CHECK ∈ `standard`, `neg_risk` |
    | content_hash | TEXT | NOT NULL | `0x` + 64 hex; SHA-256 bind |
    | expires_at | TIMESTAMPTZ | NOT NULL | ≤5m TTL (app enforced) |
    | idempotency_key | TEXT | NULL | Optional preview dedup |
    | unsigned_payload_json | JSONB | NOT NULL | EIP-712 fields; size CHECK ≤ 1 MiB |
    | human_summary_json | JSONB | NOT NULL | Display copy; size CHECK ≤ 1 MiB |
    | consumed_at | TIMESTAMPTZ | NULL | Set on submit bind (single-use) |
    | created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
    | updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

    **Indices:** `UNIQUE (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`; `(user_id, created_at DESC)`; `(expires_at)` TTL sweeper; partial index on active previews (`consumed_at IS NULL`). **Retention:** TTL eviction via worker or read-path sweep; not long-term audit.

    ### `markets.orders` (`markets_user_orders`)

    User-visible order projection. Venue authority via `upstream_source` / `upstream_id` when CLOB order id is known.

    | Field | Type | Constraints | Notes |
    |-------|------|-------------|-------|
    | id | UUID | PK | App-supplied UUID v7 |
    | user_id | TEXT | NOT NULL | Owner for `/me/orders` |
    | wallet_account_id | UUID | NULL FK → `markets_wallet_accounts` | Optional PHASE-2 link |
    | market_id | TEXT | NOT NULL | Canonical market id |
    | token_id | TEXT | NOT NULL | Outcome token id |
    | side | TEXT | NOT NULL | CHECK ∈ `BUY`, `SELL` |
    | order_type | TEXT | NOT NULL DEFAULT `LIMIT` | CHECK ∈ `LIMIT` |
    | time_in_force | TEXT | NULL | CHECK ∈ `GTC`, `GTD` when set |
    | price | TEXT | NOT NULL | DecimalString |
    | original_size | TEXT | NOT NULL | DecimalString at submit |
    | remaining_size | TEXT | NOT NULL DEFAULT `0` | DecimalString |
    | matched_size | TEXT | NOT NULL DEFAULT `0` | DecimalString |
    | status | TEXT | NOT NULL | CHECK incl. `unknown`; see DOMAIN_MODEL orders SM |
    | client_order_id | TEXT | NULL | COID reconcile key |
    | idempotency_key | TEXT | NOT NULL | **UNIQUE** — submit dedup (24h app window) |
    | preview_id | UUID | NULL FK → `markets_order_previews` | Preview bind |
    | content_hash | TEXT | NULL | Preview hash audit |
    | signed_payload_hash | TEXT | NULL | Post-sign audit |
    | maker_address | TEXT | NOT NULL | Lowercase `0x` + 40 hex; CHECK |
    | signer_address | TEXT | NOT NULL | Lowercase `0x` + 40 hex; CHECK |
    | upstream_source | TEXT | NOT NULL DEFAULT `clob` | |
    | upstream_id | TEXT | NULL | CLOB order id when known |
    | chain_id | INT | NOT NULL DEFAULT 137 | Polygon mainnet |
    | exchange_domain | TEXT | NOT NULL | CHECK ∈ `standard`, `neg_risk` |
    | observed_at | TIMESTAMPTZ | NULL | Last venue observation |
    | expires_at | TIMESTAMPTZ | NULL | GTD expiry |
    | rejection_reason | TEXT | NULL | Venue reject copy |
    | version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
    | payload_json | JSONB | NULL | Venue slices; size CHECK ≤ 1 MiB |
    | created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
    | updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

    **Status values:** `previewed`, `submitted`, `open`, `partially_filled`, `filled`, `cancel_pending`, `canceled`, `rejected`, `expired`, **`unknown`**.

    **Indices:** `UNIQUE (idempotency_key)`; `UNIQUE (upstream_source, upstream_id) WHERE upstream_id IS NOT NULL`; `UNIQUE (user_id, client_order_id) WHERE client_order_id IS NOT NULL`; `(user_id, status, updated_at DESC)`; `(user_id, created_at DESC)`; `(preview_id) WHERE preview_id IS NOT NULL`. **Retention:** account/trading lifetime (T2).

    ### `markets.order_attempts` (`markets_order_attempts`)

    Submit audit trail per SIGNING §11. One row per HTTP submit try; distinct attempt_status enum from order status.

    | Field | Type | Constraints | Notes |
    |-------|------|-------------|-------|
    | id | UUID | PK | App-supplied UUID v7 |
    | user_id | TEXT | NOT NULL | Session subject |
    | order_id | UUID | NULL FK → `markets_user_orders` | Set once order row exists |
    | preview_id | UUID | NOT NULL FK → `markets_order_previews` | |
    | idempotency_key | TEXT | NOT NULL | Mirrors submit `Idempotency-Key` header |
    | attempt_status | TEXT | NOT NULL | CHECK ∈ `preview_issued`, `submitted`, `accepted`, `rejected`, `integrity_failed` |
    | http_status | INT | NULL | BFF→CLOB HTTP code |
    | error_code | TEXT | NULL | e.g. `INTEGRITY_MISMATCH` |
    | correlation_id | TEXT | NULL | End-to-end trace |
    | request_fingerprint | TEXT | NULL | Body hash for 422 detection |
    | response_json | JSONB | NULL | Redacted CLOB ack/error; size CHECK ≤ 1 MiB |
    | created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
    | updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

    **Indices:** `(order_id)`; `(preview_id)`; `(user_id, created_at DESC)`; `(idempotency_key)` lookup (uniqueness on parent order row). **Retention:** aligned with order audit policy.

    ### `markets.fills` (`markets_fills`)

    Fill projections; idempotent reconcile by upstream trade id.

    | Field | Type | Constraints | Notes |
    |-------|------|-------------|-------|
    | id | UUID | PK | App-supplied UUID v7 |
    | user_id | TEXT | NOT NULL | Owner for `/me/fills` |
    | order_id | UUID | NOT NULL FK → `markets_user_orders` | |
    | market_id | TEXT | NOT NULL | Canonical market id |
    | token_id | TEXT | NOT NULL | Outcome token id |
    | side | TEXT | NOT NULL | CHECK ∈ `BUY`, `SELL` |
    | fill_price | TEXT | NOT NULL | DecimalString |
    | fill_size | TEXT | NOT NULL | DecimalString |
    | fee_amount | BIGINT | NULL | Base units (never float) |
    | fee_currency | TEXT | NULL DEFAULT `USDC` | |
    | fee_decimals | INT | NULL DEFAULT 6 | |
    | upstream_source | TEXT | NOT NULL DEFAULT `clob` | |
    | upstream_id | TEXT | NOT NULL | CLOB trade id |
    | tx_hash | TEXT | NULL | Chain settlement when known |
    | observed_at | TIMESTAMPTZ | NOT NULL | Venue observation time |
    | payload_json | JSONB | NULL | Normalized upstream slice; size CHECK ≤ 1 MiB |
    | created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
    | updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

    **Indices:** `UNIQUE (upstream_source, upstream_id)`; `(order_id, observed_at DESC)`; `(user_id, observed_at DESC)`. **Retention:** trading audit lifetime.

### `markets.catalog_venues`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.catalog_events`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.catalog_markets`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.catalog_outcomes`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.catalog_market_rules`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.market_data_orderbook_snapshots`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.market_data_trades`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.market_data_price_candles`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.orders` / `markets.order_attempts` / `markets.fills` / `markets.order_previews`

Phase-3 physical DDL and field specs: see **§4B Phase-3 trading DDL** above (`000021`).

### `markets.wallet_accounts` (`markets_wallet_accounts`)

API-owned signer → account wallet linkage (MKT-P2-004). Not an upstream projection tuple.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | App-supplied UUID v7 |
| user_id | TEXT | NOT NULL | RetroPick session user |
| signer_address | TEXT | NOT NULL | Lowercase `0x` + 40 hex; CHECK |
| account_wallet | TEXT | NOT NULL | Lowercase `0x` + 40 hex; CHECK; ADR-003 separate from signer |
| wallet_type | TEXT | NOT NULL | CHECK ∈ `EOA`, `POLY_PROXY`, `GNOSIS_SAFE`, `DEPOSIT_WALLET` |
| link_status | TEXT | NOT NULL | CHECK ∈ `linked`, `pending_verification` |
| is_primary | BOOLEAN | NOT NULL DEFAULT false | One primary per user+signer (partial unique index) |
| chain_id | INT | NOT NULL DEFAULT 137 | Polygon mainnet |
| linkage_proof_hash | TEXT | NULL | Optional signature-challenge hash; no relayer secrets |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |

**Indices:** `UNIQUE (user_id, signer_address, account_wallet)`; `(user_id, signer_address)` list index; partial unique on `is_primary` per signer. **Retention:** account lifetime (T2 wallet linkage).

### `markets.funding_operations`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.withdrawal_operations`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.position_projections`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.redemption_projections`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.chain_events`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.reconciliation_runs`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.builder_fee_versions`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.eligibility_decisions`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.notifications`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.watchlists` (Phase-1 physical: `public.markets_watchlists`)

See **§4A Phase-1 watchlist DDL** for authoritative field specs. Long-term target state below; generic upstream tuple columns apply to projection tables only, not user-owned watchlists.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.watchlist_items` (Phase-1 physical: `public.markets_watchlist_items`)

See **§4A Phase-1 watchlist DDL** for authoritative field specs.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.wallet_profiles`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.wallet_performance_snapshots`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.wallet_labels`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.large_trade_signals`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.market_signals`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.market_health_snapshots`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.alert_rules`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.alert_deliveries`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.signal_evidence`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.signal_retractions`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.market_relationships`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.execution_quality`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.trade_journal_entries`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.sync_checkpoints`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.

### `markets.raw_upstream_events`
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK | Internal surrogate key |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Insert time |
| updated_at | TIMESTAMPTZ | NOT NULL | Last mutation |
| upstream_source | TEXT | NOT NULL | gamma|clob|chain|relayer |
| upstream_id | TEXT | NOT NULL | Immutable venue identifier |
| version | INT | NOT NULL DEFAULT 1 | Optimistic locking |
| chain_id | INT | NOT NULL | Polygon mainnet = 137 |
| observed_at | TIMESTAMPTZ | NOT NULL | Upstream observation time |
| status | TEXT | NOT NULL | Domain-specific enum |
| payload_json | JSONB | NULL | Normalized upstream slice |
**Indices:** upstream tuple + status/time. **Retention:** domain policy in platform docs.
