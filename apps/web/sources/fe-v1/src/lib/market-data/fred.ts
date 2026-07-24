import type { LinePoint } from "./types";

const TTL_MS = 60 * 60_000;
const cache = new Map<string, { expiresAt: number; value: LinePoint[] }>();

export type FredObservationsResponse = {
  observations?: Array<{
    date: string;
    value: string;
  }>;
};

/** Same-origin proxy in dev (see vite.config); production needs an equivalent /api/fred route. */
const FRED_PROXY_PREFIX = "/api/fred";

/** Pure parse for tests — FRED observation value can be "." for missing. */
export function parseFredObservationsToLinePoints(json: FredObservationsResponse): LinePoint[] {
  const rows = json.observations;
  if (!Array.isArray(rows)) return [];

  const out: LinePoint[] = [];
  for (const row of rows) {
    if (!row?.date) continue;
    const v = Number.parseFloat(row.value);
    if (Number.isNaN(v)) continue;
    const t = Date.parse(`${row.date}T12:00:00Z`);
    if (Number.isNaN(t)) continue;
    out.push({ time: Math.floor(t / 1000), value: v });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

export async function fetchFredSeries(seriesId: string, observationYears = 10): Promise<LinePoint[]> {
  const apiKey = typeof import.meta !== "undefined" ? import.meta.env?.VITE_FRED_API_KEY as string | undefined : undefined;
  if (!apiKey) {
    throw new Error("missing_fred_key");
  }

  const end = new Date();
  const start = new Date(end.getFullYear() - observationYears, end.getMonth(), end.getDate());
  const cacheKey = `${seriesId}:${start.toISOString().slice(0, 10)}:${end.toISOString().slice(0, 10)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: "json",
    observation_start: start.toISOString().slice(0, 10),
    observation_end: end.toISOString().slice(0, 10),
  });

  const url = `${FRED_PROXY_PREFIX}/series/observations?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`FRED failed: ${res.status}`);
  const json = (await res.json()) as FredObservationsResponse;
  const value = parseFredObservationsToLinePoints(json);
  cache.set(cacheKey, { expiresAt: Date.now() + TTL_MS, value });
  return value;
}
