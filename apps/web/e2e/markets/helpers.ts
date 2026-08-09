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
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(capabilitiesFixture(orderSubmit)),
      });
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
