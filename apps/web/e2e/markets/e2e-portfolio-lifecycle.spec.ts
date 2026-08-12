import { expect, test } from "@playwright/test";

import { setupMarketsE2EPage } from "./helpers";

test("portfolio shows authenticated BFF orders, fills, positions, and activity", async ({ page }) => {
  await setupMarketsE2EPage(page, { portfolioRead: true });
  await page.goto("/markets/portfolio", { waitUntil: "networkidle", timeout: 120_000 });

  await expect(page.getByRole("region", { name: "Trading lifecycle" })).toBeVisible();
  await expect(page.getByText("BUY 100 @ 0.42 · open")).toBeVisible();
  await expect(page.getByText("BUY 25 @ 0.42 · fee 0.01 pUSD")).toBeVisible();
  await expect(page.getByText("Yes · 100 shares · 2 pUSD")).toBeVisible();
  await expect(page.getByText("Bought 25 Yes @ 0.42")).toBeVisible();
});