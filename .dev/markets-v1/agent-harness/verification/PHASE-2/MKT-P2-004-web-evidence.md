# MKT-P2-004 — Deposit wallet creation flow (web) — Evidence

**Date:** 2026-08-09  
**Agent:** Chat Q-fe  
**Task:** MKT-P2-004 (web)

## Summary

Sandbox funding UX at `/markets/funding` under `apps/web/src/products/markets/funding/`. Session-gated page shows signer vs linked `accountWallet`, reads collateral via `GET /me/balances` with explicit 404/502 handling, and supports deposit-wallet create/link via `POST /account-wallet/preview` + `/relay` when `NEXT_PUBLIC_MARKETS_ACCOUNT_WALLET_CREATE=1` and BFF is wired. Preview-before-sign modal mandatory; no relayer secret UI. **Not production-ready** — ops + security must clear Production wallet creation gate in BLOCKERS before prod.

## Verification commands

| Command | Result |
|---------|--------|
| `pnpm test:markets` (apps/web) | Pass (18 files, 54 tests) |
| `pnpm typecheck` (apps/web) | Pass |
| `graphify update .` | Pass |

## Test matrix

| Test | Proves |
|------|--------|
| `FundingPage.test.tsx` | Sandbox banner; session gate hides setup/balance panels |
| `useMarketsCollateralBalance.test.tsx` | 404 → `not_linked`; 502 → `upstream_error`; 200 → ready |
| `useDepositWalletSetup.test.tsx` | Flag off → unavailable; preview 501 → graceful; relay success → linked |
| `fundingCopy.test.ts` | No forbidden gambling UX terms |
| `fundingCustody.test.ts` | ADR-003 custody pattern scan on funding sources |
| `formatCollateral.test.ts` | pUSD MoneyAmount display without float math |

## Changed paths

| Path | Change |
|------|--------|
| `apps/web/src/products/markets/funding/**` | New funding module (page, hooks, components, client) |
| `apps/web/src/products/markets/routes/marketsRoutes.tsx` | Route `/markets/funding` |
| `apps/web/src/products/markets/routes/paths.ts` | `fundingPath()` |
| `apps/web/src/products/markets/vitest.config.ts` | Include `funding/__tests__` |
| `apps/web/tsconfig.json` | Exclude funding tests from root typecheck |
| `.dev/markets-v1/polymarket/FUNDS_DEPOSIT_AND_WITHDRAWAL.md` | §5 current state + §6.0 web sandbox UX |

## BFF integration (provisional)

| Method | Path | Client |
|--------|------|--------|
| `GET` | `/api/v1/markets/me/balances` | `getBalances()` |
| `POST` | `/api/v1/markets/account-wallet/preview` | `previewAccountWallet()` — body `{ chainId: 137 }` |
| `POST` | `/api/v1/markets/account-wallet/relay` | `relayAccountWallet()` — `Idempotency-Key` header |

OpenAPI schemas for preview/relay pending Q-be backend MKT-P2-004.

## Handoff — Q-be (backend MKT-P2-004)

1. Add OpenAPI `previewAccountWallet` / `relayAccountWallet` schemas and Go handlers.
2. Persist linkage to `wallet_accounts`; consumed by `GET /me/wallets`.
3. Return typed data in preview response for client `signTypedData`; relay accepts signature only (relayer secrets server-side).

## Handoff — ops + security

- Clear **Production wallet creation** gate in [BLOCKERS_AND_HUMAN_APPROVALS.md](../BLOCKERS_AND_HUMAN_APPROVALS.md) before enabling production deploy of create/link flow.
- Do not set `NEXT_PUBLIC_MARKETS_ACCOUNT_WALLET_CREATE=1` in production until gate cleared.

## Sign-off

- [x] Acceptance criteria met (sandbox UX, session required, 404/502 handling, feature-flag graceful empty)
- [x] No secrets in artifact
- [ ] **Not** production-ready (explicit)
