import { expect, test } from "@playwright/test";

import { gotoMarketDetail, setupMarketsE2EPage } from "./helpers";

test.describe("J07 — order preview, sign, submit", () => {
  test("e2e-j07 happy path with kill switch on submits order", async ({
    page,
  }) => {
    const submitCalls: unknown[] = [];
    await setupMarketsE2EPage(page, {
      orderSubmit: true,
      captureSubmit: { calls: submitCalls },
    });
    await gotoMarketDetail(page);

    await page.getByPlaceholder("0.42").fill("0.42");
    await page.getByPlaceholder("Shares").fill("100");
    await page.getByRole("button", { name: /preview order/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: /review order before signing/i }),
    ).toBeVisible();
    await expect(dialog.getByText(/maximum loss/i)).toBeVisible();
    await expect(dialog.getByText(/0\.10 USDC/)).toBeVisible();

    await dialog.getByRole("button", { name: /sign in wallet/i }).click();

    await expect(page.getByText(/order submitted/i)).toBeVisible();
    expect(submitCalls.length).toBe(1);
  });

  test("e2e-j07 kill switch off does not submit after sign", async ({
    page,
  }) => {
    const submitCalls: unknown[] = [];
    await setupMarketsE2EPage(page, {
      orderSubmit: false,
      captureSubmit: { calls: submitCalls },
    });
    await gotoMarketDetail(page);

    const ticket = page.getByRole("region", { name: /order ticket/i });
    await expect(
      ticket.getByText(/order submission unavailable/i),
    ).toBeVisible();

    await page.getByPlaceholder("0.42").fill("0.42");
    await page.getByPlaceholder("Shares").fill("100");
    await page.getByRole("button", { name: /preview order/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /sign in wallet/i }).click();

    await expect(page.getByText(/order submitted/i)).not.toBeVisible();
    expect(submitCalls.length).toBe(0);
  });
});
