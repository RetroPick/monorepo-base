# MKT-P2-001 — Wallet connect flow (web) — Evidence

**Date:** 2026-08-09  
**Agent:** Chat L  
**Task:** MKT-P2-001

## Summary

Markets wallet connect module implemented under `apps/web/src/products/markets/wallet/` with Polygon 137 AppKit/wagmi, signer vs trading-address disclosure, SIWE stub (P2-005 handoff), capabilities/eligibility gating, fe-v1 WalletButton quarantine, and staging route `/markets/wallet`.

## Phase advance

- `implementation-manifest.yaml`: `current_phase: PHASE-2`
- `task-graph.yaml`: MKT-P1-001…010 `done`; MKT-P2-001 `done`

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/web && pnpm typecheck` | Pass |
| `cd apps/web && pnpm test:markets` | Pass (9 files, 22 tests) |
| `go test ./internal/markets/...` | Skipped — `go` not on PATH in agent shell |
| Invariant greps | Pass — see `MKT-P2-001-invariant-greps.txt` |

## Changed paths

| Path | Change |
|------|--------|
| `apps/web/src/products/markets/wallet/**` | New wallet module |
| `apps/web/package.json` | wagmi, viem, AppKit, siwe deps |
| `apps/web/src/app/AppProviders.tsx` | MarketsWalletProvider wiring |
| `apps/web/src/shared/components/Header.tsx` | ConnectWalletButton / disclosure |
| `apps/web/src/products/markets/routes/*` | `/markets/wallet` route |
| `apps/fe-v1/src/components/Header.tsx` | `isMarketsShellRoute` quarantine (L76, L253–281) |
| `.dev/markets-v1/web/WALLET_AND_TRANSACTION_UX.md` | §5 current state + component map |

## fe-v1 quarantine (documented lines)

- **L76–77:** `isMarketsShellRoute` guard for `/app/markets/all` and `/app/markets/*`
- **L253–281:** Sign In / Sign Up / `WalletButton` hidden when `isMarketsShellRoute`

## Handoff

- **MKT-P2-003:** Pass `accountWallet` into `WalletAddressDisclosure` from `GET /me/wallets`
- **MKT-P2-005:** Replace SIWE stub in `useMarketsWalletSession.authenticate()` with OpenAPI session op
