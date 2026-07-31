import { OHLCData } from "@/data/ohlc";

export interface CryptoAsset {
  rank: number;
  id: string;
  symbol: string;
  name: string;
  image: string;
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  high24hUsd: number | null;
  low24hUsd: number | null;
  change24hPct: number | null;
  lastUpdated: string;
}

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_24h: number | null;
  last_updated: string;
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const BINANCE_BASE_URL = "https://data-api.binance.vision/api/v3";

export const FALLBACK_ASSETS: CryptoAsset[] = [
  {
    rank: 1,
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    priceUsd: 108245.44,
    marketCapUsd: 2_140_000_000_000,
    volume24hUsd: 54_200_000_000,
    high24hUsd: 109100.22,
    low24hUsd: 106882.11,
    change24hPct: 1.8,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 2,
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    priceUsd: 4218.41,
    marketCapUsd: 507_000_000_000,
    volume24hUsd: 24_800_000_000,
    high24hUsd: 4275.18,
    low24hUsd: 4144.55,
    change24hPct: -0.6,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 3,
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    image: "https://assets.coingecko.com/coins/images/325/large/Tether.png",
    priceUsd: 1,
    marketCapUsd: 145_000_000_000,
    volume24hUsd: 78_000_000_000,
    high24hUsd: 1,
    low24hUsd: 1,
    change24hPct: 0,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 4,
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    image: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    priceUsd: 702.11,
    marketCapUsd: 102_000_000_000,
    volume24hUsd: 2_400_000_000,
    high24hUsd: 710.33,
    low24hUsd: 688.14,
    change24hPct: 0.9,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 5,
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    priceUsd: 218.12,
    marketCapUsd: 109_000_000_000,
    volume24hUsd: 6_300_000_000,
    high24hUsd: 223.45,
    low24hUsd: 212.08,
    change24hPct: 2.4,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 6,
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    image: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    priceUsd: 2.61,
    marketCapUsd: 151_000_000_000,
    volume24hUsd: 4_100_000_000,
    high24hUsd: 2.68,
    low24hUsd: 2.54,
    change24hPct: 1.1,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 7,
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
    priceUsd: 0.18,
    marketCapUsd: 26_000_000_000,
    volume24hUsd: 1_900_000_000,
    high24hUsd: 0.19,
    low24hUsd: 0.17,
    change24hPct: 3.2,
    lastUpdated: new Date().toISOString(),
  },
  {
    rank: 8,
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
    priceUsd: 0.91,
    marketCapUsd: 32_000_000_000,
    volume24hUsd: 1_200_000_000,
    high24hUsd: 0.94,
    low24hUsd: 0.88,
    change24hPct: -1.2,
    lastUpdated: new Date().toISOString(),
  },
];

const BINANCE_SUPPORTED = new Set([
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "DOGE",
  "ADA",
  "AVAX",
  "LINK",
  "DOT",
  "LTC",
  "BCH",
  "ATOM",
  "TRX",
  "NEAR",
  "APT",
  "ARB",
  "OP",
  "FIL",
]);

export async function fetchTopCryptoAssets(limit = 20): Promise<CryptoAsset[]> {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(limit),
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h",
  });

  const headers: HeadersInit = {
    accept: "application/json",
  };

  if (import.meta.env.VITE_COINGECKO_DEMO_API_KEY) {
    headers["x-cg-demo-api-key"] = import.meta.env.VITE_COINGECKO_DEMO_API_KEY;
  }

  try {
    const res = await fetch(`${COINGECKO_BASE_URL}/coins/markets?${params.toString()}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      throw new Error(`CoinGecko request failed with status ${res.status}`);
    }

    const data = (await res.json()) as CoinGeckoMarket[];
    return data.map((coin) => ({
      rank: coin.market_cap_rank,
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
      priceUsd: coin.current_price,
      marketCapUsd: coin.market_cap,
      volume24hUsd: coin.total_volume,
      high24hUsd: coin.high_24h,
      low24hUsd: coin.low_24h,
      change24hPct: coin.price_change_percentage_24h,
      lastUpdated: coin.last_updated,
    }));
  } catch {
    return FALLBACK_ASSETS.slice(0, Math.min(limit, FALLBACK_ASSETS.length));
  }
}

function toTimeLabel(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildSyntheticChart(asset: CryptoAsset, points = 60): OHLCData[] {
  const data: OHLCData[] = [];
  let base = asset.priceUsd || 100;
  const now = Date.now();
  const swing = Math.max(base * 0.006, 0.5);

  for (let i = points; i >= 0; i -= 1) {
    const timestamp = now - i * 5 * 60 * 1000;
    const change = (Math.random() - 0.5) * swing;
    const open = base;
    const close = Math.max(0.0001, base + change);
    const wick = Math.max(base * 0.002, 0.1);
    const high = Math.max(open, close) + Math.random() * wick;
    const low = Math.max(0.0001, Math.min(open, close) - Math.random() * wick);

    data.push({
      time: toTimeLabel(timestamp),
      open,
      high,
      low,
      close,
      volume: Math.floor((asset.volume24hUsd || 1_000_000) / points),
    });

    base = close;
  }

  return data;
}

export async function fetchAssetCandles(symbol: string, timeframe: "5 MIN" | "1 HOUR" | "1 DAY", fallbackAsset?: CryptoAsset): Promise<OHLCData[]> {
  const intervalMap = {
    "5 MIN": "5m",
    "1 HOUR": "1h",
    "1 DAY": "1d",
  } as const;

  if (!BINANCE_SUPPORTED.has(symbol)) {
    return buildSyntheticChart(fallbackAsset || FALLBACK_ASSETS[0]);
  }

  try {
    const params = new URLSearchParams({
      symbol: `${symbol}USDT`,
      interval: intervalMap[timeframe],
      limit: "80",
    });

    const res = await fetch(`${BINANCE_BASE_URL}/klines?${params.toString()}`, {
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Binance request failed with status ${res.status}`);
    }

    const klines = (await res.json()) as BinanceKline[];
    return klines.map((kline) => ({
      time: toTimeLabel(kline[0]),
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
      volume: Number(kline[7]),
    }));
  } catch {
    return buildSyntheticChart(fallbackAsset || FALLBACK_ASSETS[0]);
  }
}
