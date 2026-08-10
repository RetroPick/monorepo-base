# MKT-P2-004 — Web OpenAPI align (funding client) — Evidence

**Date:** 2026-08-09  
**Agent:** Chat C  
**Task:** MKT-P2-004 web OpenAPI align (`fundingApiClient.ts` + frozen funding consumers)

## Summary

Aligned provisional web funding BFF client to OpenAPI v1.1.1 wallet link/preview/relay shapes (authoritative per [MKT-P2-004-openapi-evidence.md](./MKT-P2-004-openapi-evidence.md)). Removed provisional `typedData` / `previewId` / `signature` flow. Added `linkExistingWallet`. Idempotency-Key on link + relay only; all mutating POSTs use `credentials: "include"`. No relayer secrets or key custody in client. CREATE flag remains default off.

## Environment

- Branch: `main`
- Commit: `591ad7137` (local working tree includes uncommitted web align edits from this task)

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/web && pnpm test:markets` | Pass (20 files, 67 tests) |
| `cd apps/web && pnpm typecheck` | Pass |
| `graphify update .` | Pass |

## Divergence resolved (before → after)

| Surface | Provisional (before) | OpenAPI-aligned (after) |
|---------|---------------------|-------------------------|
| Preview request | `{ chainId: 137 }` | `{ action?: "link_existing" \| "deploy_deposit_wallet" }` (hook sends `deploy_deposit_wallet`) |
| Preview response | `{ previewId, typedData, summary? }` | `{ schemaVersion, signerAddress, action, chainId, message }` |
| Relay request | `{ previewId, signature }` | `{ accountWallet, chainId?, isPrimary?, linkageProofHash? }` |
| Relay response | `{ accountWallet, walletType?, linkStatus? }` | `{ schemaVersion, signerAddress, wallet: LinkedWallet }` |
| Link existing | not implemented | `POST /me/wallets/link` → bare `LinkedWallet` |

## Idempotency and auth

| Operation | Idempotency-Key | credentials |
|-----------|-----------------|-------------|
| `linkExistingWallet` | required (UUID) | `include` |
| `previewAccountWallet` | omitted | `include` |
| `relayAccountWallet` | required (UUID) | `include` |

## Hook / UX note

`useDepositWalletSetup` accepts optional `deployDepositWallet()` callback. Without it, confirm after preview fails closed with user-visible error — upstream relayer deploy is not wired in this client build. Tests inject mock deploy; production wiring is a follow-up task.

## Changed paths

| Path | Change |
|------|--------|
| `apps/web/src/products/markets/funding/lib/fundingApiClient.ts` | OpenAPI types; `linkExistingWallet`, aligned preview/relay; shared `postJson`; error codes `conflict`, `invalid_request`, 503→unavailable |
| `apps/web/src/products/markets/funding/hooks/useDepositWalletSetup.ts` | Removed wagmi `signTypedData`; deploy callback + OpenAPI relay shape |
| `apps/web/src/products/markets/funding/components/DepositWalletSetupPanel.tsx` | Display `preview.message` + dynamic `chainId` |
| `apps/web/src/products/markets/funding/__tests__/fundingApiClient.test.ts` | New — fetch mock asserts bodies, Idempotency-Key, credentials |
| `apps/web/src/products/markets/funding/__tests__/useDepositWalletSetup.test.tsx` | OpenAPI mocks; deploy callback success + missing-callback error paths |

## Test matrix

| Test | Proves |
|------|--------|
| `fundingApiClient.test.ts` | Preview body/action; link+relay Idempotency-Key; credentials include |
| `useDepositWalletSetup.test.tsx` | Flag off → unavailable; 501 → unavailable; missing deploy → error; deploy+relay → linked |
| `fundingCustody.test.ts` | ADR-003 custody scan still passes |

## Explicit non-goals

- Upstream Polymarket relayer HTTP in browser
- Backend router G2 wiring
- Production wallet creation gate clearance
- `NEXT_PUBLIC_MARKETS_ACCOUNT_WALLET_CREATE=1` in any env

## Sign-off

- [x] Preview/link/relay request/response shapes match OpenAPI v1.1.1
- [x] Idempotency-Key on link + relay only
- [x] Mutating POSTs use `credentials: "include"`
- [x] No relayer secrets or key custody in funding sources
- [x] CREATE flag default off unchanged
- [x] `pnpm test:markets` + `pnpm typecheck` pass
- [x] No secrets in artifact
