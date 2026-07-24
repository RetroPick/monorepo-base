import { CandlePoint, KlineInterval } from "./types";
import { FALLBACK_ASSETS } from "./coingecko";

const BINANCE_REST_BASE = "https://data-api.binance.vision/api/v3";
const CANDLE_TTL_MS = 10_000;
const PRICE_TTL_MS = 4_000;

const candleCache = new Map<string, { expiresAt: number; value: CandlePoint[] }>();
const candleInflight = new Map<string, Promise<CandlePoint[]>>();
const priceCache = new Map<string, { expiresAt: number; value: Record<string, number> }>();
const priceInflight = new Map<string, Promise<Record<string, number>>>();

type BinanceKlineRow = [
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

type BinancePriceRow = {
  symbol: string;
  price: string;
};

function buildSyntheticCandles(basePrice: number, volumeBase = 1_000_000, points = 200): CandlePoint[] {
  const result: CandlePoint[] = [];
  let last = basePrice;
  const now = Date.now();
  const swing = Math.max(basePrice * 0.006, 0.5);

  for (let index = points; index >= 0; index -= 1) {
    const time = Math.floor((now - index * 60_000) / 1000);
    const drift = (Math.random() - 0.5) * swing;
    const open = last;
    const close = Math.max(0.0001, last + drift);
    const wick = Math.max(basePrice * 0.002, 0.1);
    result.push({
      time,
      open,
      high: Math.max(open, close) + Math.random() * wick,
      low: Math.max(0.0001, Math.min(open, close) - Math.random() * wick),
      close,
      volume: Math.floor(volumeBase / points),
    });
    last = close;
  }

  return result;
}

export async function fetchBinanceCandles(symbol: string, interval: KlineInterval = "1m", limit = 200): Promise<CandlePoint[]> {
  const cacheKey = `${symbol.toUpperCase()}:${interval}:${limit}`;
  const cached = candleCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const inflight = candleInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval,
    limit: String(limit),
  });

  const request = (async () => {
    try {
      const res = await fetch(`${BINANCE_REST_BASE}/klines?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Binance klines failed: ${res.status}`);

      const rows = (await res.json()) as BinanceKlineRow[];
      const value = rows.map((row) => ({
        time: Math.floor(row[0] / 1000),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
        volume: Number(row[5]),
      }));
      candleCache.set(cacheKey, { expiresAt: Date.now() + CANDLE_TTL_MS, value });
      return value;
    } catch {
      const fallback = FALLBACK_ASSETS.find((asset) => asset.exchangeSymbol === symbol.toUpperCase()) ?? FALLBACK_ASSETS[0];
      const value = buildSyntheticCandles(fallback.priceUsd, fallback.volume24hUsd, limit);
      candleCache.set(cacheKey, { expiresAt: Date.now() + CANDLE_TTL_MS, value });
      return value;
    } finally {
      candleInflight.delete(cacheKey);
    }
  })();

  candleInflight.set(cacheKey, request);
  return request;
}

export async function fetchBinancePrices(symbols: string[]): Promise<Record<string, number>> {
  if (!symbols.length) return {};

  const normalizedSymbols = symbols.map((symbol) => symbol.toUpperCase()).sort();
  const cacheKey = normalizedSymbols.join(",");
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const inflight = priceInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const params = new URLSearchParams({
        symbols: JSON.stringify(normalizedSymbols),
      });

      const res = await fetch(`${BINANCE_REST_BASE}/ticker/price?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Binance prices failed: ${res.status}`);

      const rows = (await res.json()) as BinancePriceRow[];
      const value = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.symbol.toUpperCase()] = Number(row.price);
        return acc;
      }, {});
      priceCache.set(cacheKey, { expiresAt: Date.now() + PRICE_TTL_MS, value });
      return value;
    } catch {
      return {};
    } finally {
      priceInflight.delete(cacheKey);
    }
  })();

  priceInflight.set(cacheKey, request);
  return request;
}
