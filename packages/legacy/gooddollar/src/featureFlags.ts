export type GoodDollarFeatureFlags = {
  goodDollarEnabled: boolean;
  goodIdEnabled: boolean;
  engagementRewardsEnabled: boolean;
  feeRouterEnabled: boolean;
  referralsEnabled: boolean;
  rewardsEnabled: boolean;
  impactEnabled: boolean;
};

export function readFeatureFlagsFromEnv(env: Record<string, string | undefined>): GoodDollarFeatureFlags {
  const on = (key: string) => env[key] === "1" || env[key] === "true";
  return {
    goodDollarEnabled: on("VITE_GOODDOLLAR_ENABLED") || on("GOODDOLLAR_ENABLED"),
    goodIdEnabled: on("VITE_GOODID_ENABLED") || on("GOODID_ENABLED"),
    engagementRewardsEnabled: on("VITE_ENGAGEMENT_REWARDS_ENABLED") || on("ENGAGEMENT_REWARDS_ENABLED"),
    feeRouterEnabled: on("VITE_FEE_ROUTER_ENABLED") || on("FEE_ROUTER_ENABLED"),
    referralsEnabled: on("VITE_REFERRALS_ENABLED") || on("REFERRALS_ENABLED"),
    rewardsEnabled: on("VITE_REWARDS_ENABLED") || on("REWARDS_ENABLED"),
    impactEnabled: on("VITE_IMPACT_ENABLED") || on("IMPACT_ENABLED"),
  };
}

export const defaultFeatureFlags: GoodDollarFeatureFlags = {
  goodDollarEnabled: false,
  goodIdEnabled: false,
  engagementRewardsEnabled: false,
  feeRouterEnabled: false,
  referralsEnabled: false,
  rewardsEnabled: false,
  impactEnabled: false,
};
