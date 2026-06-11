import { fetchTopNonStableChartableAssets } from "./coingecko";
import { makeRetroPickRoundCard } from "./dto";
import { RetroPickRoundCardDTO } from "./types";

const DAY_ONE_ALLOWED = new Set(["BTC", "ETH", "SOL", "BNB"]);

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
