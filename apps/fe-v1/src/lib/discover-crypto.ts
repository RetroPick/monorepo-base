import type { DiscoveryMarket } from "@/types/discovery-market";

/** Single primary horizon bucket per market for Crypto left nav. */
export type CryptoHorizonId = "all" | "5m" | "daily" | "weekly" | "ending_soon";

export type CryptoAssetFilterId = "all" | "BTC" | "ETH" | "SOL";

export function getCryptoHorizon(m: DiscoveryMarket): Exclude<CryptoHorizonId, "all"> {
  const mt = (m.marketType ?? "").toLowerCase();
  if (mt.includes("5 minute") || m.expiry === "5m") return "5m";
  if (m.schedule === "Weekly") return "weekly";
  if (m.timeBucket === "Ending Soon") return "ending_soon";
  return "daily";
}

export function marketMatchesHorizon(m: DiscoveryMarket, horizon: CryptoHorizonId): boolean {
  if (horizon === "all") return true;
  return getCryptoHorizon(m) === horizon;
}

export function countByHorizon(markets: DiscoveryMarket[]): Record<Exclude<CryptoHorizonId, "all">, number> {
  const acc = { "5m": 0, daily: 0, weekly: 0, ending_soon: 0 };
  for (const m of markets) {
    acc[getCryptoHorizon(m)] += 1;
  }
  return acc;
}

export function countByAsset(markets: DiscoveryMarket[]): Record<"BTC" | "ETH" | "SOL", number> {
  const acc = { BTC: 0, ETH: 0, SOL: 0 };
  for (const m of markets) {
    acc[m.assetSymbol] += 1;
  }
  return acc;
}

export const HORIZON_META: readonly { id: Exclude<CryptoHorizonId, "all">; label: string }[] = [
  { id: "5m", label: "5 Min" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "ending_soon", label: "Ending soon" },
];
