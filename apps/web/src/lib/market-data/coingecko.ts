import { AssetUniverseEntry, CoinGeckoMarket } from "./types";
import { isStablecoin } from "./stablecoins";
import { mapCoinGeckoIdToBinanceSymbol } from "./symbol-map";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const TOP_ASSETS_TTL_MS = 60_000;

let topAssetsCache: { expiresAt: number; value: AssetUniverseEntry[] } | null = null;
let topAssetsInflight: Promise<AssetUniverseEntry[]> | null = null;

export const FALLBACK_ASSETS: AssetUniverseEntry[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    rank: 1,
    priceUsd: 108245.44,
    marketCapUsd: 2_140_000_000_000,
    volume24hUsd: 54_200_000_000,
    high24hUsd: 109100.22,
    low24hUsd: 106882.11,
    priceChange24h: 1924.18,
    priceChangePct24h: 1.8,
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "BTCUSDT",
    displayPair: "BTC/USDT",
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    rank: 2,
    priceUsd: 4218.41,
    marketCapUsd: 507_000_000_000,
    volume24hUsd: 24_800_000_000,
    high24hUsd: 4275.18,
    low24hUsd: 4144.55,
    priceChange24h: -25.6,
    priceChangePct24h: -0.6,
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "ETHUSDT",
    displayPair: "ETH/USDT",
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    rank: 4,
    priceUsd: 702.11,
    marketCapUsd: 102_000_000_000,
    volume24hUsd: 2_400_000_000,
    high24hUsd: 710.33,
    low24hUsd: 688.14,
    priceChange24h: 6.1,
    priceChangePct24h: 0.9,
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "BNBUSDT",
    displayPair: "BNB/USDT",
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    rank: 5,
    priceUsd: 218.12,
    marketCapUsd: 109_000_000_000,
    volume24hUsd: 6_300_000_000,
    high24hUsd: 223.45,
    low24hUsd: 212.08,
    priceChange24h: 5.12,
    priceChangePct24h: 2.4,
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "SOLUSDT",
    displayPair: "SOL/USDT",
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    rank: 6,
    priceUsd: 2.61,
    marketCapUsd: 144_000_000_000,
    volume24hUsd: 7_600_000_000,
    high24hUsd: 2.68,
    low24hUsd: 2.49,
    priceChange24h: 0.04,
    priceChangePct24h: 1.5,
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "XRPUSDT",
    displayPair: "XRP/USDT",
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    rank: 8,
    priceUsd: 0.21,
    marketCapUsd: 31_000_000_000,
    volume24hUsd: 2_800_000_000,
    high24hUsd: 0.216,
    low24hUsd: 0.201,
    priceChange24h: 0.005,
    priceChangePct24h: 2.3,
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "DOGEUSDT",
    displayPair: "DOGE/USDT",
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    rank: 9,
    priceUsd: 0.94,
    marketCapUsd: 33_000_000_000,
    volume24hUsd: 1_100_000_000,
    high24hUsd: 0.97,
    low24hUsd: 0.91,
    priceChange24h: 0.02,
    priceChangePct24h: 2.0,
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "ADAUSDT",
    displayPair: "ADA/USDT",
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    rank: 15,
    priceUsd: 22.34,
    marketCapUsd: 14_000_000_000,
    volume24hUsd: 950_000_000,
    high24hUsd: 22.9,
    low24hUsd: 21.7,
    priceChange24h: 0.31,
    priceChangePct24h: 1.4,
    image: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    lastUpdated: new Date().toISOString(),
    exchangeSymbol: "LINKUSDT",
    displayPair: "LINK/USDT",
  },
];

export async function fetchTopNonStableChartableAssets(targetCount = 20, fetchCount = 60): Promise<AssetUniverseEntry[]> {
  if (topAssetsCache && topAssetsCache.expiresAt > Date.now()) {
    return topAssetsCache.value.slice(0, Math.min(targetCount, topAssetsCache.value.length));
  }

  if (topAssetsInflight) {
    const value = await topAssetsInflight;
    return value.slice(0, Math.min(targetCount, value.length));
  }

  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(fetchCount),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const headers: HeadersInit = { accept: "application/json" };
  if (import.meta.env.VITE_COINGECKO_DEMO_API_KEY) {
    headers["x-cg-demo-api-key"] = import.meta.env.VITE_COINGECKO_DEMO_API_KEY;
  }

  topAssetsInflight = (async () => {
    try {
      const res = await fetch(`${COINGECKO_BASE_URL}/coins/markets?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`CoinGecko request failed with status ${res.status}`);

      const rows = (await res.json()) as CoinGeckoMarket[];
      const result: AssetUniverseEntry[] = [];

      for (const row of rows) {
        if (isStablecoin({ id: row.id, symbol: row.symbol, name: row.name })) continue;
        const exchangeSymbol = mapCoinGeckoIdToBinanceSymbol(row.id);
        if (!exchangeSymbol) continue;

        result.push({
          id: row.id,
          symbol: row.symbol.toUpperCase(),
          name: row.name,
          rank: row.market_cap_rank,
          priceUsd: row.current_price,
          marketCapUsd: row.market_cap,
          volume24hUsd: row.total_volume,
          high24hUsd: row.high_24h ?? null,
          low24hUsd: row.low_24h ?? null,
          priceChange24h: row.price_change_24h ?? null,
          priceChangePct24h: row.price_change_percentage_24h ?? null,
          image: row.image,
          lastUpdated: row.last_updated,
          exchangeSymbol,
          displayPair: `${row.symbol.toUpperCase()}/USDT`,
        });

        if (result.length >= targetCount) break;
      }

      topAssetsCache = {
        expiresAt: Date.now() + TOP_ASSETS_TTL_MS,
        value: result,
      };
      return result;
    } catch {
      const fallback = FALLBACK_ASSETS.slice(0, Math.min(targetCount, FALLBACK_ASSETS.length));
      topAssetsCache = {
        expiresAt: Date.now() + TOP_ASSETS_TTL_MS,
        value: fallback,
      };
      return fallback;
    } finally {
      topAssetsInflight = null;
    }
  })();

  const value = await topAssetsInflight;
  return value.slice(0, Math.min(targetCount, value.length));
}
