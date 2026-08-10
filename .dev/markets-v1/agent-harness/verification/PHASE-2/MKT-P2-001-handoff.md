# Agent Handoff — MKT-P2-001

## Summary

Wallet connect flow (web) complete. Markets-specific AppKit/wagmi on Polygon 137; no T4 custody; signer ≠ account wallet messaging; fe-v1 legacy wallet quarantined on markets routes.

## Task ID

MKT-P2-001

## Shell wiring (approved expansion)

| File | Lines / change |
|------|----------------|
| `apps/web/src/app/AppProviders.tsx` | `MarketsWalletProvider` inside `QueryClientProvider` |
| `apps/web/src/shared/components/Header.tsx` | Replaced Sign In/Up placeholders with `ConnectWalletButton` / `WalletAddressDisclosure` |
| `apps/web/src/products/markets/routes/paths.ts` | Added `walletConnectPath()` |
| `apps/web/src/products/markets/routes/marketsRoutes.tsx` | Route `/markets/wallet` → `WalletConnectPage` |
| `apps/fe-v1/src/components/Header.tsx` | L76–77, L253–281 — `isMarketsShellRoute` quarantine |

## Suggested next tasks

- **MKT-P2-002** — Fail-closed eligibility service (backend)
- **MKT-P2-005** — Session middleware (wire SIWE stub)
- **MKT-P2-003** — Account wallet discovery (`GET /me/wallets` → disclosure)

## Evidence

`.dev/markets-v1/agent-harness/verification/PHASE-2/MKT-P2-001-evidence.md`
