import type { DiscoveryMarket } from "@/types/discovery-market";

export function yesPercentFromPools(market: DiscoveryMarket) {
  const t = market.yesPoolValue + market.noPoolValue;
  if (t <= 0) return 50;
  return Math.round((market.yesPoolValue / t) * 100);
}

export function thresholdSubtitle(market: DiscoveryMarket) {
  const v = market.thresholdValue;
  const price =
    v >= 1000
      ? `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `${price} · ${market.thresholdLabel}`;
}
