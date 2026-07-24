import { expect, test } from "@playwright/test"

test("waitlist page renders core CTA", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByText("Trade Markets")).toBeVisible()
  await expect(page.locator('button:has-text("Join Waitlist"):visible').first()).toBeVisible()
  await expect(page.locator('input[placeholder="Enter your email"]:visible').first()).toBeVisible()
})
