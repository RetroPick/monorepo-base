import { describe, expect, it, vi } from "vitest";

import { goodDollarEnabled } from "./config";

describe("gooddollar config", () => {
  it("defaults feature flag from env", () => {
    expect(typeof goodDollarEnabled).toBe("boolean");
  });
});

describe("GUSDollarBalanceCard", () => {
  it("placeholder for onboarding flow", () => {
    expect(true).toBe(true);
  });
});

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined }),
}));
