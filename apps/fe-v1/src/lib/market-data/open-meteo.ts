import type { LinePoint } from "./types";
import { WEATHER_LAT, WEATHER_LON } from "./asset-classes";

const TTL_MS = 15 * 60_000;
const cache = new Map<string, { expiresAt: number; value: LinePoint[] }>();

export type OpenMeteoArchiveDaily = {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
  };
};

/** Pure parse for tests. */
export function parseOpenMeteoDailyMaxTemps(json: OpenMeteoArchiveDaily): LinePoint[] {
  const times = json.daily?.time;
  const temps = json.daily?.temperature_2m_max;
  if (!Array.isArray(times) || !Array.isArray(temps)) return [];

  const out: LinePoint[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const dateStr = times[i];
    const v = temps[i];
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    const t = Date.parse(`${dateStr}T12:00:00Z`);
    if (Number.isNaN(t)) continue;
    out.push({ time: Math.floor(t / 1000), value: v });
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

function endDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Daily max temperature (°C) — archive API. */
export async function fetchOpenMeteoTemperatureHistory(days = 365): Promise<LinePoint[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const cacheKey = `wx:${startDateStr(start)}:${endDateStr(end)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const params = new URLSearchParams({
    latitude: String(WEATHER_LAT),
    longitude: String(WEATHER_LON),
    start_date: startDateStr(start),
    end_date: endDateStr(end),
    daily: "temperature_2m_max",
    timezone: "auto",
  });

  const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Open-Meteo failed: ${res.status}`);
  const json = (await res.json()) as OpenMeteoArchiveDaily;
  const value = parseOpenMeteoDailyMaxTemps(json);
  cache.set(cacheKey, { expiresAt: Date.now() + TTL_MS, value });
  return value;
}
