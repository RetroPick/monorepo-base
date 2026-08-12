import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import {
  E2E_SIGNATURE,
  E2E_WALLET,
  E2E_MARKET_PATH,
  capabilitiesFixture,
  e2eMarketDetail,
  e2eOrderBook,
  e2ePreviewResponse,
  eligibilityFixture,
} from "./fixtures";

export type BffMockOptions = {
  orderSubmit?: boolean;
  portfolioRead?: boolean;
  eligible?: boolean;
  eligibilityReason?: string;
  marketFreshness?: "fresh" | "stale";
  captureSubmit?: { calls: unknown[] };
};

export async function injectMarketsE2EHarness(page: Page) {
  await page.addInitScript(
    ({ wallet, signature }) => {
      window.__MARKETS_E2E__ = {
        wallet: { connected: true, address: wallet, chainId: 137 },
        session: { wallet, expiresAt: "2099-01-01T00:00:00Z" },
        signSignature: signature,
      };
    },
    { wallet: E2E_WALLET, signature: E2E_SIGNATURE },
  );
}

export async function mockMarketsBff(page: Page, options: BffMockOptions = {}) {
  const orderSubmit = options.orderSubmit ?? false;
  const portfolioRead = options.portfolioRead ?? false;
  const eligible = options.eligible ?? true;
  const captureSubmit = options.captureSubmit;

  const marketDetail =
    options.marketFreshness === "stale"
      ? {
          ...e2eMarketDetail,
          freshness: {
            state: "stale",
            observedAt: "2026-07-30T12:00:00Z",
            ageMillis: 120000,
          },
        }
      : e2eMarketDetail;

  await page.route("**/api/v1/markets/**", async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes("/capabilities") && method === "GET") {
      const capabilities = capabilitiesFixture(orderSubmit);
      capabilities.features.portfolio_read = portfolioRead;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(capabilities),
      });
    }

    if (url.includes("/me/orders") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "1", orders: [{ orderId: "order-e2e-1", marketId: "polymarket:market:456", tokenId: "token-yes", side: "BUY", price: "0.42", originalSize: "100", filledSize: "0", remainingSize: "100", status: "open", exchangeDomain: "standard", createdAt: "2026-08-09T10:05:00Z", updatedAt: "2026-08-09T10:05:00Z" }], page: { limit: 50 }, checkedAt: "2026-08-09T10:06:00Z", provenance: { source: "polymarket_clob", observedAt: "2026-08-09T10:06:00Z" } }) });
    }

    if (url.includes("/me/fills") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "1", fills: [{ fillId: "fill-e2e-1", orderId: "order-e2e-1", venueTradeId: "trade-1", marketId: "polymarket:market:456", tokenId: "token-yes", side: "BUY", price: "0.42", size: "25", fee: { amount: "10000", currency: "pUSD", decimals: 6 }, filledAt: "2026-08-09T10:07:00Z" }], page: { limit: 50 }, checkedAt: "2026-08-09T10:07:30Z" }) });
    }

    if (url.includes("/me/positions") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "1", positions: [{ positionId: "position-e2e-1", marketId: "polymarket:market:456", tokenId: "token-yes", outcomeName: "Yes", size: "100", averageEntryPrice: "0.40", costBasis: { amount: "40000000", currency: "pUSD", decimals: 6 }, unrealizedPnl: { amount: "2000000", currency: "pUSD", decimals: 6 }, resolutionState: "active", claimable: false, exchangeDomain: "standard", updatedAt: "2026-08-09T10:08:00Z" }], page: { limit: 50 }, checkedAt: "2026-08-09T10:08:30Z", provenance: { source: "retropick_projection", observedAt: "2026-08-09T10:08:30Z" } }) });
    }

    if (url.includes("/me/portfolio/summary") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "1", accountWallet: E2E_WALLET, aggregate: { totalMarkValue: { amount: "42000000", currency: "pUSD", decimals: 6 }, totalCostBasis: { amount: "40000000", currency: "pUSD", decimals: 6 }, unrealizedPnl: { amount: "2000000", currency: "pUSD", decimals: 6 }, realizedPnl: { amount: "0", currency: "pUSD", decimals: 6 }, claimableValue: { amount: "0", currency: "pUSD", decimals: 6 }, openPositionCount: 1 }, pnlDisclaimer: "Descriptive projection.", checkedAt: "2026-08-09T10:08:30Z", provenance: { source: "retropick_projection", observedAt: "2026-08-09T10:08:30Z" } }) });
    }

    if (url.includes("/me/activity") && method === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "1", events: [{ eventId: "activity-e2e-1", eventType: "order_filled", occurredAt: "2026-08-09T10:07:00Z", summary: "Bought 25 Yes @ 0.42" }], page: { limit: 50 }, checkedAt: "2026-08-09T10:08:00Z" }) });
    }

    if (url.includes("/eligibility") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          eligibilityFixture(eligible, options.eligibilityReason),
        ),
      });
    }

    if (url.includes("/me/wallets") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "1",
          wallets: [{ accountWallet: E2E_WALLET, isPrimary: true, linkStatus: "linked" }],
        }),
      });
    }

    if (url.match(/\/markets\/markets\//) && method === "GET" && !url.includes("/orderbook") && !url.includes("/history") && !url.includes("/health")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(marketDetail),
      });
    }

    if (url.includes("/orderbook") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(e2eOrderBook),
      });
    }

    if (url.includes("/orders/preview") && method === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(e2ePreviewResponse),
      });
    }

    if (url.includes("/orders/submit") && method === "POST") {
      const body = route.request().postDataJSON();
      captureSubmit?.calls.push(body);
      if (!orderSubmit) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "capability_disabled", message: "Order submit disabled." },
          }),
        });
      }
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          schemaVersion: "1",
          orderId: "order-e2e-1",
          status: "open",
        }),
      });
    }

    if (url.includes("/auth/session") && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ wallet: E2E_WALLET, expiresAt: "2099-01-01T00:00:00Z" }),
      });
    }

    return route.continue();
  });
}

export async function setupMarketsE2EPage(page: Page, options: BffMockOptions = {}) {
  await injectMarketsE2EHarness(page);
  await mockMarketsBff(page, options);
}

export async function gotoMarketDetail(page: Page) {
  await page.goto(E2E_MARKET_PATH, { waitUntil: "networkidle", timeout: 120_000 });
  await expect(page.getByRole("heading", { name: "Will A happen?" })).toBeVisible({
    timeout: 60_000,
  });
}
