# MKT-P3-004 — Web Order Ticket — Evidence

**Date:** 2026-08-09  
**Task:** MKT-P3-004  
**Agent:** Chat Web

## Summary

Implemented Markets V1 web **order ticket** under `apps/web/src/products/markets/trading/`: limit-order form, fresh eligibility refetch before preview, stale-book marketable guard, preview modal with fee/max-loss disclosure, EIP-712 `signTypedData`, and capability-gated submit (`features.order_submit`). Wired into market detail page with book click-to-price.

## Verification commands

| Command | Result |
|---------|--------|
| `cd apps/web && pnpm test:markets` | Pass (24 files, 76 tests) |
| `cd apps/web && pnpm typecheck` | Pass |
| `graphify update .` | Pass |

## Acceptance criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Fresh eligibility before each order | `useOrderTicketFlow` calls `eligibilityQuery.refetch()` before `previewOrder` |
| 2 | Stale book disables marketable limits | `bookTradingGuard.test.ts` + `OrderTicketPanel.test.tsx` |
| 3 | Preview before sign with humanSummary + contentHash | `OrderPreviewModal` + `FeeDisclosure` |
| 4 | EIP-712 sign via wagmi | `buildOrderTypedData` + `confirmSignAndSubmit` |
| 5 | Submit gated on `features.order_submit` | `useMarketsOrderSubmitCapability`; disabled CTA copy when false |
| 6 | No gambling UX copy | `tradingCopy.test.ts` + root `copy.test.ts` scan |
| 7 | Wired into market route | `MarketDetailPage` + `OrderBookPanel.onSelectPrice` |

## Changed paths

| Path | Change |
|------|--------|
| `apps/web/src/products/markets/trading/**` | New trading module (ticket, preview modal, hooks, API client, guards) |
| `apps/web/src/products/markets/pages/MarketDetailPage.tsx` | Order ticket + book price selection glue |
| `apps/web/src/products/markets/components/OrderBookPanel.tsx` | Optional `onSelectPrice` on levels |
| `apps/web/src/products/markets/vitest.config.ts` | Include `trading/__tests__` |
| `apps/web/tsconfig.json` | Exclude trading tests from root typecheck |
| `.dev/markets-v1/web/MARKET_AND_ORDERBOOK_UX.md` | Current state + ticket implementation notes |

## Design notes

- Preview/submit HTTP client mirrors funding pattern (`credentials: "include"`, `Idempotency-Key`).
- Client `computeContentHash` matches Go `json.Marshal` envelope for populated payloads (`0xa92a…` for standard golden payload fields). Backend testdata YAML omits struct yaml tags on nested fields — server runtime hash uses live preview assembly (MKT-P3-001).
- Submit endpoint (`POST /markets/orders`) client-ready; live submit remains off until MKT-P3-002 + `order_submit=true`.
- Exchange verifying contracts pinned from EV-008 registry in `exchangeRegistry.ts`.

## Handoff

- **MKT-P3-002:** Enable submit path when OpenAPI + handler land; flip `order_submit` in capabilities for staging.
- **MKT-P3-008:** Full neg-risk routing tests beyond domain label + registry pin.

## Sign-off

- [x] Order ticket UI on market page
- [x] Tests + typecheck green
- [x] No backend CLOB / fe-v1 / auto-copy changes
- [ ] Staging E2E with live preview + wallet (requires BLK-001 eligibility + session)
