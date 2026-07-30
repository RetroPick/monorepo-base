import { createMarketsClient } from "@retropick/polymarket";

import { getApiBaseUrl } from "@/lib/runtimeEnv";

let singleton: ReturnType<typeof createMarketsClient> | null = null;

export function getMarketsClient() {
  if (!singleton) {
    singleton = createMarketsClient({ baseUrl: getApiBaseUrl() });
  }
  return singleton;
}

export function resetMarketsClientForTests() {
  singleton = null;
}
