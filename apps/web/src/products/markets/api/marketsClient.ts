import { createMarketsClient } from "@retropick/polymarket";

import { getMarketsApiBaseUrl } from "@/shared/lib/marketsRuntimeEnv";

let singleton: ReturnType<typeof createMarketsClient> | null = null;

export function resolveApiBaseUrl(): string {
  return getMarketsApiBaseUrl();
}

export function getMarketsClient() {
  if (!singleton) {
    singleton = createMarketsClient({ baseUrl: resolveApiBaseUrl() });
  }
  return singleton;
}

export function resetMarketsClientForTests() {
  singleton = null;
}
