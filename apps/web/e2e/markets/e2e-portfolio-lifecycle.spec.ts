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

test("open order cancellation requires preview then an explicit wallet signature", async ({ page }) => {
  await setupMarketsE2EPage(page, { orderSubmit: true, portfolioRead: true });
  await page.goto("/markets/portfolio", { waitUntil: "networkidle", timeout: 120_000 });

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog", { name: "Cancel order preview" })).toBeVisible();
  await expect(page.getByText(/Your wallet will ask you to sign this cancel/i)).toBeVisible();
  await page.getByRole("button", { name: "Sign and cancel" }).click();
  await expect(page.getByRole("dialog", { name: "Cancel order preview" })).toBeHidden();
});