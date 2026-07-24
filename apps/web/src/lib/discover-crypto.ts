import type { Market } from "@/types/market";
import { inferChainAssetFromSlug } from "@/lib/market-data/chainDiscover";

/** Single primary horizon bucket per market for Crypto left nav. */
export type CryptoHorizonId = "all" | "5m" | "daily" | "weekly" | "ending_soon";

export type CryptoAssetFilterId = "all" | "BTC" | "ETH" | "SOL" | "LINK";

/**
 * List API has no per-epoch timing; Discover crypto rail only offers “All” for horizon
 * (see `horizonOptions` in MarketsAll).
 */
export function getCryptoHorizonId(_m: Market): Exclude<CryptoHorizonId, "all"> {
  return "daily";
}

export function marketChainMatchesHorizon(m: Market, horizon: CryptoHorizonId): boolean {
  if (horizon === "all") return true;
  return getCryptoHorizonId(m) === horizon;
}

export function marketChainMatchesAsset(m: Market, filter: CryptoAssetFilterId): boolean {
  if (filter === "all") return true;
  const slug = m.slug;
  if (!slug) return false;
  return inferChainAssetFromSlug(slug) === filter;
}

export function countByHorizon(_markets: Market[]): Record<Exclude<CryptoHorizonId, "all">, number> {
  return { "5m": 0, daily: 0, weekly: 0, ending_soon: 0 };
}

export function countByAsset(markets: Market[]): Record<"BTC" | "ETH" | "SOL" | "LINK", number> {
  const acc = { BTC: 0, ETH: 0, SOL: 0, LINK: 0 };
  for (const m of markets) {
    const s = m.slug;
    if (!s) continue;
    const a = inferChainAssetFromSlug(s);
    if (a) acc[a] += 1;
  }
  return acc;
}

export const HORIZON_META: readonly { id: Exclude<CryptoHorizonId, "all">; label: string }[] = [
  { id: "5m", label: "5 Min" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "ending_soon", label: "Ending soon" },
];
