import { expect, test } from "@playwright/test";

import { setupMarketsE2EPage } from "./helpers";

test("portfolio shows authenticated BFF position projections and activity", async ({ page }) => {
  await setupMarketsE2EPage(page, { portfolioRead: true });
  await page.goto("/markets/portfolio", { waitUntil: "networkidle", timeout: 120_000 });

  await expect(page.getByRole("region", { name: "Portfolio projections" })).toBeVisible();
  await expect(page.getByText("Yes · 100 shares")).toBeVisible();
  await expect(page.getByText("Mark unavailable")).toBeVisible();
  await expect(page.getByText("Current value unavailable")).toBeVisible();
  await expect(page.getByText("Unrealized PnL 2 pUSD")).toBeVisible();
  await expect(page.getByText("Bought 25 Yes @ 0.42")).toBeVisible();
});

test("portfolio hides private projections when the BFF capability is disabled", async ({ page }) => {
  await setupMarketsE2EPage(page, { portfolioRead: false });
  await page.goto("/markets/portfolio", { waitUntil: "networkidle", timeout: 120_000 });

  await expect(page.getByText("Portfolio projections unavailable")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Positions" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeHidden();
});