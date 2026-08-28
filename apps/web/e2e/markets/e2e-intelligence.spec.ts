import { expect, test } from "@playwright/test";

import { setupMarketsE2EPage } from "./helpers";

test("intelligence hides the whale feed when the BFF capability is disabled", async ({ page }) => {
  await setupMarketsE2EPage(page, { intelligenceWhaleFeed: false });
  await page.goto("/markets/intelligence", { waitUntil: "networkidle", timeout: 120_000 });

  await expect(page.getByText("Whale feed unavailable")).toBeVisible();
  await expect(page.getByText("Will A happen?")).toBeHidden();
});

test("intelligence renders BFF whale evidence without an order action", async ({ page }) => {
  await setupMarketsE2EPage(page, { intelligenceWhaleFeed: true });
  await page.goto("/markets/intelligence", { waitUntil: "networkidle", timeout: 120_000 });

  await expect(page.getByText("Will A happen?")).toBeVisible();
  await expect(page.getByText(/WHALE_NOTIONAL_THRESHOLD/)).toBeVisible();
  await expect(page.getByText(/sha256:aaaaaaaa/)).toBeVisible();
  await expect(page.getByRole("button", { name: /copy|follow|order/i })).toHaveCount(0);
});
