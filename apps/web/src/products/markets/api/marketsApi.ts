import type {
  MarketsCapabilities,
  MarketsEligibility,
  MarketsEventsList,
} from "@retropick/polymarket";

import { getApiBaseUrl } from "@/lib/runtimeEnv";

const base = getApiBaseUrl();

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Markets API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchMarketsEligibility() {
  return getJson<MarketsEligibility>("/api/v1/markets/eligibility");
}

export function fetchMarketsCapabilities() {
  return getJson<MarketsCapabilities>("/api/v1/markets/capabilities");
}

export function fetchMarketsEvents(cursor?: string) {
  const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return getJson<MarketsEventsList>(`/api/v1/markets/events${q}`);
}
