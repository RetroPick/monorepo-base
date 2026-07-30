import type { LinePoint } from "./types";
import { FX_FROM, FX_TO } from "./asset-classes";

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { expiresAt: number; value: LinePoint[] }>();

export type FrankfurterTimeSeriesResponse = {
  base: string;
  start_date?: string;
  end_date?: string;
  rates?: Record<string, Record<string, number>>;
};

/** Pure parse for tests — Frankfurter `..` range response with daily rates. */
export function parseFrankfurterRatesToLinePoints(
  json: FrankfurterTimeSeriesResponse,
  quote: string,
): LinePoint[] {
  const rates = json.rates;
  if (!rates || typeof rates !== "object") return [];

  const entries = Object.entries(rates)
    .map(([dateStr, dayRates]) => {
      const v = dayRates?.[quote];
      if (typeof v !== "number" || Number.isNaN(v)) return null;
      const t = Date.parse(`${dateStr}T12:00:00Z`);
      if (Number.isNaN(t)) return null;
      return { time: Math.floor(t / 1000), value: v };
    })
    .filter((x): x is LinePoint => x !== null);

  entries.sort((a, b) => a.time - b.time);
  return entries;
}

function endDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** ~400 business days of daily EUR/USD (USD per 1 EUR). */
export async function fetchFrankfurterEurUsdHistory(days = 420): Promise<LinePoint[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const cacheKey = `eurusd:${startDateStr(start)}:${endDateStr(end)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = `https://api.frankfurter.app/${startDateStr(start)}..${endDateStr(end)}?from=${FX_FROM}&to=${FX_TO}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Frankfurter failed: ${res.status}`);
  const json = (await res.json()) as FrankfurterTimeSeriesResponse;
  const value = parseFrankfurterRatesToLinePoints(json, FX_TO);
  cache.set(cacheKey, { expiresAt: Date.now() + TTL_MS, value });
  return value;
}
