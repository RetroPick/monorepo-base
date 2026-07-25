import { fetchMarkets, type MarketRow } from "@/lib/api/retropickApi";
import { fetchTopNonStableChartableAssets } from "./coingecko";
import { makeRetroPickRoundCard } from "./dto";
import { RetroPickRoundCardDTO } from "./types";

const DAY_ONE_ALLOWED = new Set(["BTC", "ETH", "SOL", "BNB"]);

/** Maps indexed chain markets to discover cards (no CoinGecko dependency). */
export function marketRowsToRetroPickCards(markets: MarketRow[]): RetroPickRoundCardDTO[] {
  const now = Date.now();
  return markets.map((m, index) => {
    const label = m.slug.replace(/-/g, " ") || m.templateId.slice(0, 10);
    const status: RetroPickRoundCardDTO["status"] =
      m.rollingPhase > 0 && m.rollingHaltReason === 0 ? "LIVE" : "UPCOMING";
    return {
      roundId: m.templateId,
      slug: m.slug,
      assetId: m.templateId,
      assetSymbol: label.slice(0, 12).toUpperCase(),
      assetName: label,
      displayPair: m.slug,
      oracleSource: "Indexed market (RetroPick API)",
      roundType: "UP_DOWN",
      intervalLabel: "epoch",
      lockTime: new Date(now + index * 60_000).toISOString(),
      closeTime: new Date(now + (index + 1) * 60_000).toISOString(),
      status,
      currentPriceUsd: null,
      priceChangePct24h: null,
      chartPair: m.slug,
      chartReady: false,
      settlementNote: `Last indexed block ${m.lastIndexedBlock}. Rolling phase ${m.rollingPhase}.`,
    };
  });
}

export async function buildRetroPickRoundCardsFromApi(): Promise<RetroPickRoundCardDTO[]> {
  const markets = await fetchMarkets();
  return marketRowsToRetroPickCards(markets);
}

export async function buildMockRetroPickRoundCards(): Promise<RetroPickRoundCardDTO[]> {
  const assets = await fetchTopNonStableChartableAssets(20, 60);
  const curated = assets.filter((asset) => DAY_ONE_ALLOWED.has(asset.symbol)).slice(0, 4);
  const now = Date.now();

  return curated.map((asset, index) =>
    makeRetroPickRoundCard({
      roundId: `round-${asset.symbol.toLowerCase()}-${index + 1}`,
      slug: `${asset.symbol.toLowerCase()}-5m-up-down`,
      asset,
      lockTime: new Date(now + (index + 1) * 5 * 60 * 1000).toISOString(),
      closeTime: new Date(now + (index + 2) * 5 * 60 * 1000).toISOString(),
      status: index === 0 ? "LIVE" : "UPCOMING",
      intervalLabel: "5m",
    }),
  );
}
