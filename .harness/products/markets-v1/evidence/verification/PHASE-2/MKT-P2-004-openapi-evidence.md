# MKT-P2-004 — OpenAPI + contract freeze (wallet link/preview/relay) — Evidence

**Date:** 2026-08-09  
**Agent:** Chat OA  
**Task:** MKT-P2-004 OpenAPI half

## Summary

OpenAPI v1.1.1 freeze for three PHASE-2 account-wallet write operations already implemented in `apps/backend/internal/markets/wallet/`. Shapes match Go handler JSON (BFF authoritative). Provisional web `fundingApiClient.ts` diverges — not canonical. No router, migration, handler, or web changes in this task.

## Environment

- Branch: `main`
- Commit: `591ad7137` (local working tree includes uncommitted OpenAPI/doc edits from this task)

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/backend && go test ./internal/markets/... -count=1 -run TestMarketsOpenAPIContainsPhaseOneReadContract` | Pass |
| `cd apps/backend && go test ./internal/markets/... -count=1 -run TestOpenAPIRuntimeConformancePhaseOne` | Pass (kin-openapi load + validate on full spec) |
| `rg -n 'type: number\|float' schemas/openapi/markets-v1.yaml` | Pass — matches only description text; no float money on wallet schemas |
| `graphify update .` | Pass |

## OpenAPI paths added

| Method | Path | operationId | x-phase | Security |
|--------|------|-------------|---------|----------|
| `POST` | `/markets/me/wallets/link` | `linkExistingWallet` | 2 | `MarketsSession` |
| `POST` | `/markets/account-wallet/preview` | `previewAccountWallet` | 2 | `MarketsSession` |
| `POST` | `/markets/account-wallet/relay` | `relayAccountWallet` | 2 | `MarketsSession` |

## Schema mapping (Go → OpenAPI)

| Go type (`link.go`) | OpenAPI schema |
|---------------------|----------------|
| `LinkExistingRequest` | `LinkExistingWalletRequest` |
| `LinkedWallet` (link 200 body) | `LinkedWallet` |
| `AccountWalletPreviewRequest` | `AccountWalletPreviewRequest` |
| `AccountWalletPreviewResponse` | `AccountWalletPreviewResponse` |
| `AccountWalletRelayRequest` | `AccountWalletRelayRequest` |
| `AccountWalletRelayResponse` | `AccountWalletRelayResponse` |
| `AccountWalletAction` | `AccountWalletAction` |

## Idempotency

- `components.parameters.IdempotencyKey` added (UUID header).
- Required on `linkExistingWallet` and `relayAccountWallet`.
- Omitted on `previewAccountWallet` (non-mutating metadata stub).

## Changed paths

| Path | Change |
|------|--------|
| `schemas/openapi/markets-v1.yaml` | 3 POST paths, `IdempotencyKey` param, 6 schemas + examples |
| `.dev/markets-v1/backend/API_AND_REALTIME_CONTRACTS.md` | §3.3 me/account-wallet semantics; removed preview/relay from §3.2 planned table |
| `.dev/markets-v1/testing/CONTRACT_AND_CONFORMANCE_TESTS.md` | MKT-P2-004 spec-freeze run note under out-of-scope |

## Web divergence (documented, not fixed)

| Surface | Provisional web (`fundingApiClient.ts`) | BFF / OpenAPI (canonical) |
|---------|----------------------------------------|---------------------------|
| Preview request | `{ chainId: 137 }` | `{ action?: "link_existing" \| "deploy_deposit_wallet" }` |
| Preview response | `{ previewId, typedData, summary? }` | `{ schemaVersion, signerAddress, action, chainId, message }` |
| Relay request | `{ previewId, signature }` | `{ accountWallet, chainId?, isPrimary?, linkageProofHash? }` |
| Relay response | `{ accountWallet, walletType?, linkStatus? }` | `{ schemaVersion, signerAddress, wallet: LinkedWallet }` |

## Handoff — Chat W2 (optional typed client regen)

1. Regenerate or hand-align TypeScript types from frozen OpenAPI.
2. Update `apps/web/src/products/markets/funding/lib/fundingApiClient.ts` and `useDepositWalletSetup.ts` to BFF shapes.
3. Keep `Idempotency-Key` on relay (already sent by provisional client).

## Handoff — Chat G2 (router wiring)

1. Mount `wallet.RegisterAccountWalletRoutes` at `/api/v1/markets/account-wallet` with auth middleware.
2. Wire `PostgresAccountStore` as `Linker` + `Discoverer` backing store.
3. Optional: enforce `Idempotency-Key` at middleware layer per contract §7.

## Sign-off

- [x] Three POST paths with `x-phase: 2` and `MarketsSession`
- [x] Request/response JSON matches Go handler structs + wallet tests
- [x] No float/binary money on new schemas
- [x] OpenAPI load/validate passes via existing kin-openapi tests
- [x] Contract doc §3.3 semantics + idempotency documented
- [x] W2 handoff noted for optional client regen
- [x] No secrets in artifact
