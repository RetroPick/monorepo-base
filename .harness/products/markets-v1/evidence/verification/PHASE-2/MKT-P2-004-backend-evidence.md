# MKT-P2-004 — Backend Postgres AccountStore + Link Writes — Evidence

**Date:** 2026-08-09  
**Agent:** Chat Q-be  
**Task:** MKT-P2-004 backend half

## Summary

Postgres-backed signer → account wallet persistence landed in `apps/backend/internal/markets/wallet/` with migration `000020_markets_v1_wallet_accounts`. Link write handlers: `POST /me/wallets/link`, `POST /account-wallet/preview`, `POST /account-wallet/relay` (preview/relay stubs — no relayer HTTP, no invented addresses). Production `GET /me/wallets` still returns empty until Chat G2 wires `PostgresAccountStore` in `router.go`.

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/wallet/... -v` | Pass (18 tests; 2 Postgres integration skipped without `DATABASE_URL`) |
| `go test ./migrations/... -v -run WalletAccounts` | Pass |

## Test matrix

| Test | Proves |
|------|--------|
| `TestDiscoverer_NeverInventsAddress` | Unwired default → empty `wallets` |
| `TestLinkExistingWallet_PersistsAndLists` | POST link → GET list round-trip; proxy signer ≠ account |
| `TestLinkExistingWallet_Adr003DistinctFieldsEOA` | EOA link exposes `accountWallet` key |
| `TestLinkExistingWallet_LinkerUnwired` | Nil linker → HTTP 503 |
| `TestAccountWalletPreview_DeployAction` | Preview returns signer + action metadata |
| `TestAccountWalletRelay_PersistsDepositWallet` | Relay persists client address; idempotent; list after |
| `TestAccountWalletRelay_NeverInventsAddress` | Empty relay body → 400 |
| `TestPostgresAccountStore_ListAndUpsert` | PG list/upsert + primary uniqueness (integration) |
| `TestMarketsV1WalletAccountsMigration` | DDL constraints, no floats |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/migrations/000020_markets_v1_wallet_accounts.*.sql` | New table |
| `apps/backend/migrations/markets_v1_test.go` | Migration assertions |
| `apps/backend/internal/markets/wallet/store.go` | `AccountLinker`, `LinkRecord`, `MemoryStore.UpsertLink` |
| `apps/backend/internal/markets/wallet/postgres_store.go` | `PostgresAccountStore` |
| `apps/backend/internal/markets/wallet/link.go` | Link service + wire types |
| `apps/backend/internal/markets/wallet/handler.go` | Link + account-wallet routes |
| `apps/backend/internal/markets/wallet/discovery.go` | `NewDiscoverer` helper |
| `apps/backend/internal/markets/wallet/errors.go` | Link errors |
| `apps/backend/internal/markets/wallet/*_test.go` | New/extended tests |
| `.dev/markets-v1/polymarket/AUTHENTICATION_AND_ACCOUNT_WALLETS.md` | §5, §6.10 store |
| `.dev/markets-v1/backend/DATABASE_AND_MIGRATIONS.md` | `wallet_accounts` spec |

## ADR-003 proofs

- Discovery reads store only; never synthesizes `accountWallet`.
- Relay/link require client-supplied deployed address.
- Session signer from `SessionResolver` only.

## Handoff — Chat G2 (router wiring)

1. `store := wallet.NewPostgresAccountStore(pool)`
2. Pass `Discoverer: wallet.NewDiscoverer(store, metrics)` and `Linker: store` into `wallet.RegisterRoutes`.
3. Mount `wallet.RegisterAccountWalletRoutes` at `/api/v1/markets/account-wallet` with auth-only middleware.

## Handoff — Chat Q-fe (deposit flow)

- `POST /account-wallet/preview` + `/relay` for new Deposit Wallet; `POST /me/wallets/link` for connect-existing.
- Poll `GET /me/wallets` for primary `accountWallet` after G2 wires store.

## Handoff — Chat R / L2 (venue balances)

- Primary wallet resolution via same `AccountStore` once G2 wires Postgres.
