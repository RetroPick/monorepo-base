import { createMarketsClient } from "@retropick/polymarket";

let singleton: ReturnType<typeof createMarketsClient> | null = null;

export function resolveApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "");
  }
  return "";
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
