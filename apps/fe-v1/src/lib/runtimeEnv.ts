const LOCAL_API_BASE_URL = "http://127.0.0.1:8080";

function envValue(name: string): string | undefined {
  const env =
    typeof process !== "undefined" && process.env
      ? process.env
      : ({} as Record<string, string | undefined>);
  const value = env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return trimTrailingSlash(
    envValue("NEXT_PUBLIC_API_URL") ??
      envValue("VITE_API_URL") ??
      LOCAL_API_BASE_URL,
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
  return envValue("NODE_ENV") !== "production" && envValue("MODE") !== "production";
}
