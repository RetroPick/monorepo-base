import type { components } from "@retropick/polymarket";

import { resolveApiBaseUrl } from "./marketsClient";

export type WhaleFeedListResponse = components["schemas"]["WhaleFeedListResponse"];

export async function listMarketsWhales(signal?: AbortSignal): Promise<WhaleFeedListResponse> {
  const response = await fetch(`${resolveApiBaseUrl()}/api/v1/markets/intelligence/whales`, {
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Intelligence whale feed request failed (${response.status})`);
  }

  return (await response.json()) as WhaleFeedListResponse;
}
