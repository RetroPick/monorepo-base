const LOCAL_API_BASE_URL = "http://127.0.0.1:8080";
const LOCAL_DOCS_URL = "http://localhost:3002/docs";

const nextPublicEnv: Record<string, string | undefined> = {
  API_RETRIES: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_RETRIES : undefined,
  API_TIMEOUT_MS: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_TIMEOUT_MS : undefined,
  API_URL: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL : undefined,
  APP_DEFAULT_NETWORK: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_DEFAULT_NETWORK : undefined,
  APP_FUNDING_PROFILE: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_APP_FUNDING_PROFILE : undefined,
  COINGECKO_DEMO_API_KEY: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_COINGECKO_DEMO_API_KEY : undefined,
  DOCS_URL: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DOCS_URL : undefined,
  ENABLE_GEOFENCING: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_ENABLE_GEOFENCING : undefined,
  ENABLE_WALLET_SCREENING: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_ENABLE_WALLET_SCREENING : undefined,
  EXECUTION_LEDGER_ADDRESS: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_EXECUTION_LEDGER_ADDRESS : undefined,
  FRED_API_KEY: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_FRED_API_KEY : undefined,
  IP_GEOLOCATION_API_KEY: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_IP_GEOLOCATION_API_KEY : undefined,
  LEGACY_FAUCET_ADDRESS: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LEGACY_FAUCET_ADDRESS : undefined,
  LIFI_API_KEY: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LIFI_API_KEY : undefined,
  MARKET_ENGINE_ADDRESS: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MARKET_ENGINE_ADDRESS : undefined,
  MARKET_ENGINE_ADDRESS_TESTNET:
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MARKET_ENGINE_ADDRESS_TESTNET : undefined,
  MARKET_REGISTRY_ADDRESS: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MARKET_REGISTRY_ADDRESS : undefined,
  RELAYER_URL: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RELAYER_URL : undefined,
  REOWN_PROJECT_ID: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_REOWN_PROJECT_ID : undefined,
  RPC_ARBITRUM: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RPC_ARBITRUM : undefined,
  RPC_ARBITRUM_SEPOLIA: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA : undefined,
  TRM_LABS_API_KEY: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TRM_LABS_API_KEY : undefined,
  WLD_ACTION: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WLD_ACTION : undefined,
  WLD_APP_ID: typeof process !== "undefined" ? process.env.NEXT_PUBLIC_WLD_APP_ID : undefined,
};

function viteEnv(): Record<string, string | undefined> {
  return ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});
}

function envValue(name: string): string | undefined {
  const nodeValue = typeof process !== "undefined" && process.env ? process.env[name] : undefined;
  const value = name.startsWith("NEXT_PUBLIC_")
    ? nextPublicEnv[name.slice("NEXT_PUBLIC_".length)]
    : name.startsWith("VITE_")
      ? viteEnv()[name]
      : nodeValue ?? viteEnv()[name];
  return value && value.trim() ? value.trim() : undefined;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function isProductionRuntime(): boolean {
  return envValue("MODE") === "production" || envValue("NODE_ENV") === "production";
}

function configuredOrDevLocal(configured: string | undefined, localFallback: string, name: string): string {
  if (configured) return trimTrailingSlash(configured);
  if (!isProductionRuntime()) return localFallback;
  throw new Error(`${name} is not configured`);
}

export function getApiBaseUrl(): string {
  return configuredOrDevLocal(
    envValue("NEXT_PUBLIC_API_URL") ?? envValue("VITE_API_URL"),
    LOCAL_API_BASE_URL,
    "NEXT_PUBLIC_API_URL",
  );
}

export function getDocsSiteUrl(): string {
  return configuredOrDevLocal(
    envValue("NEXT_PUBLIC_DOCS_URL") ?? envValue("VITE_DOCS_URL"),
    LOCAL_DOCS_URL,
    "NEXT_PUBLIC_DOCS_URL",
  );
}

export function getApiTimeoutMs(): number {
  return Number(envValue("NEXT_PUBLIC_API_TIMEOUT_MS") ?? envValue("VITE_API_TIMEOUT_MS") ?? 12_000);
}

export function getApiRetries(): number {
  return Number(envValue("NEXT_PUBLIC_API_RETRIES") ?? envValue("VITE_API_RETRIES") ?? 1);
}

export function getRelayerBaseUrl(): string {
  const configured = envValue("NEXT_PUBLIC_RELAYER_URL") ?? envValue("VITE_RELAYER_URL");
  if (configured) return trimTrailingSlash(configured);

  if (envValue("MODE") === "production" || envValue("NODE_ENV") === "production") {
    throw new Error("Demo relayer is disabled in production unless NEXT_PUBLIC_RELAYER_URL is configured");
  }

  return "http://localhost:8790";
}

export function getReownProjectId(): string {
  return (
    envValue("NEXT_PUBLIC_REOWN_PROJECT_ID") ??
    envValue("VITE_REOWN_PROJECT_ID") ??
    "f39121ec755731ed58c1605658872bce"
  );
}

export function getDefaultNetworkKey(): string | undefined {
  return envValue("NEXT_PUBLIC_APP_DEFAULT_NETWORK") ?? envValue("VITE_APP_DEFAULT_NETWORK");
}

export function getRpcUrl(name: string): string | undefined {
  return envValue(`NEXT_PUBLIC_RPC_${name}`) ?? envValue(`VITE_RPC_${name}`);
}

export function getPublicEnv(name: string): string | undefined {
  return envValue(`NEXT_PUBLIC_${name}`) ?? envValue(`VITE_${name}`);
}

export function isDevRuntime(): boolean {
  return !isProductionRuntime();
}
