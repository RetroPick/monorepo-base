import { expect, test } from "@playwright/test";

import { gotoMarketDetail, setupMarketsE2EPage } from "./helpers";

test.describe("J03 — market and rules review", () => {
  test("e2e-j03 loads market detail with rules and order ticket", async ({ page }) => {
    await setupMarketsE2EPage(page);
    await gotoMarketDetail(page);

    await expect(page.getByRole("region", { name: /resolution rules/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Official results" })).toBeVisible();
    await expect(page.getByRole("region", { name: /order ticket/i })).toBeVisible();
    await expect(page.getByRole("region", { name: /order book snapshot/i })).toBeVisible();
  });

  test("e2e-j03 blocked eligibility disables preview flow", async ({ page }) => {
    await setupMarketsE2EPage(page, { eligible: false, eligibilityReason: "geo_denied" });
    await gotoMarketDetail(page);

    await expect(page.getByRole("region", { name: /order ticket/i })).toBeVisible();
    await page.getByPlaceholder("0.42").fill("0.42");
    await page.getByPlaceholder("USDC amount").fill("100");
    await page.getByRole("button", { name: /preview order/i }).click();

    await expect(page.getByText("geo_denied")).toBeVisible();
  });

  test("e2e-j03 degraded freshness shows stale banner", async ({ page }) => {
    await setupMarketsE2EPage(page, { marketFreshness: "stale" });
    await gotoMarketDetail(page);

    await expect(page.getByText(/catalog data may be outdated/i)).toBeVisible();
  });
});
