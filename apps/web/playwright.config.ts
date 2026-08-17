import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.MARKETS_WEB_BASE_URL ?? "http://127.0.0.1:3011";

export default defineConfig({
  testDir: "./e2e/markets",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 60_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["junit", { outputFile: "e2e/markets/junit.xml" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec next dev -p 3011",
    env: {
      ...process.env,
      NEXT_PUBLIC_MARKETS_E2E_TEST_MODE: "1",
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
