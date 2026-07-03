import { describe, expect, it } from "vitest";

import { defaultFeatureFlags, readFeatureFlagsFromEnv } from "./featureFlags";

describe("readFeatureFlagsFromEnv", () => {
  it("defaults all flags off", () => {
    expect(readFeatureFlagsFromEnv({})).toEqual(defaultFeatureFlags);
  });

  it("enables goodDollar from VITE or backend env", () => {
    expect(readFeatureFlagsFromEnv({ VITE_GOODDOLLAR_ENABLED: "1" }).goodDollarEnabled).toBe(true);
    expect(readFeatureFlagsFromEnv({ GOODDOLLAR_ENABLED: "true" }).goodDollarEnabled).toBe(true);
    expect(readFeatureFlagsFromEnv({ VITE_GOODDOLLAR_ENABLED: "0" }).goodDollarEnabled).toBe(false);
  });

  it("enables fee router and referrals independently", () => {
    const flags = readFeatureFlagsFromEnv({
      FEE_ROUTER_ENABLED: "1",
      VITE_REFERRALS_ENABLED: "true",
      REWARDS_ENABLED: "1",
      IMPACT_ENABLED: "1",
      GOODID_ENABLED: "1",
      ENGAGEMENT_REWARDS_ENABLED: "1",
    });
    expect(flags.feeRouterEnabled).toBe(true);
    expect(flags.referralsEnabled).toBe(true);
    expect(flags.rewardsEnabled).toBe(true);
    expect(flags.impactEnabled).toBe(true);
    expect(flags.goodIdEnabled).toBe(true);
    expect(flags.engagementRewardsEnabled).toBe(true);
    expect(flags.goodDollarEnabled).toBe(false);
  });
});
