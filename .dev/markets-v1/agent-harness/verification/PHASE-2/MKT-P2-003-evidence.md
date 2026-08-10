# MKT-P2-003 — Account wallet discovery — Evidence

**Date:** 2026-08-09  
**Agent:** Chat P  
**Task:** MKT-P2-003

## Summary

Account wallet discovery module at `apps/backend/internal/markets/wallet/` serves `GET /api/v1/markets/me/wallets` (`listMyWallets`) with ADR-003-safe signer/account separation. Default deployment returns `401` until Chat N wires `SessionResolver`; `UnwiredStore` returns empty `wallets` without inventing addresses. OpenAPI phase-2 schemas added; web hook fetches when session authenticated.

## Verification commands

| Command | Result |
|---------|--------|
| `go test ./internal/markets/wallet/... -v` | Pass (6 tests) — see [MKT-P2-003-test-output.txt](./MKT-P2-003-test-output.txt) |
| `go test ./internal/markets/...` | Blocked by pre-existing `internal/markets/auth/siwe.go` build error (Chat N scope; unrelated to wallet package) |
| `pnpm test:markets` (apps/web) | Pass (9 files, 22 tests) |
| `graphify update .` | Pass |

## Signer vs account wallet separation tests

| Test | Proves |
|------|--------|
| `TestDiscoverer_ProxySignerAccountSeparation` | Proxy: signer `0xaaa…` ≠ account `0xbbb…` |
| `TestDiscoverer_EOADistinctFields` | EOA: equal values, distinct JSON keys |
| `TestDiscoverer_NeverInventsAddress` | `UnwiredStore` → empty `wallets` |
| `TestListMyWallets_Unauthorized` | Default resolver → HTTP 401 |
| `TestListMyWallets_LinkedWithStubAuth` | Stub session + memory store → both addresses |
| `TestWalletsListResponse_JSONContract` | OpenAPI wire shape |

## Changed paths

| Path | Change |
|------|--------|
| `apps/backend/internal/markets/wallet/**` | New discovery module |
| `apps/backend/internal/markets/router.go` | Mount `wallet.RegisterRoutes` |
| `schemas/openapi/markets-v1.yaml` | `listMyWallets`, `WalletsListResponse`, `LinkedWallet`, `WalletType`, `LinkStatus`, `MarketsSession` |
| `.dev/markets-v1/polymarket/AUTHENTICATION_AND_ACCOUNT_WALLETS.md` | §5 status, §6.4/6.5 scope, §6.9 API contract |
| `apps/web/src/products/markets/wallet/hooks/useMarketsTradingWallets.ts` | BFF fetch when session authenticated |
| `apps/web/src/products/markets/wallet/components/WalletAddressDisclosure.tsx` | Wire fetched `accountWallet` |

## OpenAPI claim

- **Path:** `GET /api/v1/markets/me/wallets`
- **operationId:** `listMyWallets`
- **Schemas:** `WalletsListResponse`, `LinkedWallet`, `WalletType`, `LinkStatus`

## Handoff — Chat N (session auth)

1. Implement `wallet.SessionResolver` (JWT/cookie from MKT-P2-005).
2. Pass resolver into `wallet.RegisterRoutes(r, wallet.HandlerConfig{Sessions: …})` in `router.go`.
3. Do not accept client-spoof headers for signer identity.

## Handoff — MKT-P2-004 (deposit wallet creation)

1. Implement Postgres `AccountStore` backed by `markets.wallet_accounts`.
2. `POST /markets/account-wallet/preview` + `/relay` write linkage consumed by `GET /me/wallets`.
3. Do not invent Deposit Wallet addresses in discovery — store only.

## Handoff — MKT-P2-006 (deposit flow)

1. Read primary `accountWallet` from `GET /me/wallets` (`wallets[].isPrimary` or first entry).
2. Funding/deposit UX targets that address, not the signer EOA.

## Handoff — Web

- `useMarketsTradingWallets` activates only when `isSessionAuthenticated`; 401 leaves placeholder text.
- Until P2-005 session lands, UI shows “Linked after account setup” (expected).
