const LOCAL_MARKETS_API_BASE_URL = "http://127.0.0.1:8080";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function readEnv(name: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function isProductionRuntime(): boolean {
  return readEnv("NODE_ENV") === "production";
}

function configuredOrDevLocal(configured: string | undefined, localFallback: string, name: string): string {
  if (configured) return trimTrailingSlash(configured);
  if (!isProductionRuntime()) return localFallback;
  throw new Error(`${name} is not configured`);
}

/**
 * BFF origin for Markets catalog, auth, and funding fetches.
 * Accepts NEXT_PUBLIC_API_BASE_URL (code) or NEXT_PUBLIC_API_URL (platform docs).
 */
export function getMarketsApiBaseUrl(): string {
  return configuredOrDevLocal(
    readEnv("NEXT_PUBLIC_API_BASE_URL") ?? readEnv("NEXT_PUBLIC_API_URL"),
    LOCAL_MARKETS_API_BASE_URL,
    "NEXT_PUBLIC_API_BASE_URL",
  );
}

/** @deprecated Use getMarketsApiBaseUrl — kept for wallet/funding call sites. */
export function getMarketsApiOrigin(): string {
  return getMarketsApiBaseUrl();
}
