# MKT-P2-005 Web — SIWE session client

**Task:** MKT-P2-005 (web follow-up)  
**Agent:** Chat W  
**Date:** 2026-08-09  
**Status:** **done**

## Summary

Wired Markets web SIWE session client to Chat N BFF auth: server-issued nonce, EIP-4361 sign, HttpOnly cookie session restore, CSRF-protected logout. Shared session context fixes isolated hook state across disclosure/harness/trading-wallets. No private key storage (ADR-003).

## Client flow

1. Wallet connect → `GET /api/v1/markets/auth/session` (`credentials: include`)
2. Sign in → `GET /api/v1/markets/auth/nonce` → wallet sign → `POST /api/v1/markets/auth/siwe`
3. Sign out → `POST /api/v1/markets/auth/logout` + `X-CSRF-Token` from `mkt_csrf`

## Verification

```bash
cd apps/web && pnpm typecheck
cd apps/web && pnpm test:markets
```

| Command | Result |
|---------|--------|
| `pnpm typecheck` | Pass |
| `pnpm test:markets` | Pass — 12 files, 37 tests |

## Changed paths

| Path | Change |
|------|--------|
| `apps/web/src/products/markets/wallet/lib/marketsAuthClient.ts` | New BFF auth client |
| `apps/web/src/products/markets/wallet/lib/readCookie.ts` | CSRF cookie reader |
| `apps/web/src/products/markets/wallet/lib/walletErrors.ts` | Auth error codes + mapper |
| `apps/web/src/products/markets/wallet/providers/MarketsWalletSessionProvider.tsx` | Shared session context |
| `apps/web/src/products/markets/wallet/providers/MarketsWalletProvider.tsx` | Nest session provider |
| `apps/web/src/products/markets/wallet/hooks/useMarketsWalletSession.ts` | Context re-export |
| `apps/web/src/products/markets/wallet/components/WalletAddressDisclosure.tsx` | Sign in/out UI |
| `apps/web/src/products/markets/wallet/components/WalletConnectHarness.tsx` | Session QA panel |
| `apps/web/src/products/markets/wallet/index.ts` | Export session provider |
| `apps/web/src/products/markets/wallet/__tests__/*` | Auth + session tests |
| `.dev/markets-v1/web/WALLET_AND_TRANSACTION_UX.md` | §5 + §5.1 session client |

## Manual staging checklist

- [ ] BFF running with `MARKETS_CORS_ALLOWED_ORIGINS=http://localhost:3001`
- [ ] Web dev on `:3001` with `NEXT_PUBLIC_API_BASE_URL` pointing at BFF
- [ ] Open `/markets/wallet`, connect wallet on Polygon 137
- [ ] Session restore after refresh (cookie present)
- [ ] Sign in with wallet → session active
- [ ] Sign out clears session; trading wallets placeholder returns

## Out of scope

- Funding UI (P2-004)
- fe-v1 shell rewrite
- Order submit (PHASE-3)

## Handoff

- **MKT-P2-003 / P2-006:** `useMarketsTradingWallets` already gates on `isSessionAuthenticated`; verify end-to-end once BFF wallet discovery resolver is wired
- **PHASE-3:** Order preview/sign flows reuse session cookie on authenticated BFF routes
