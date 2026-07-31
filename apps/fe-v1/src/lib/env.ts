/**
 * Read Vite (`VITE_*`) or Next (`NEXT_PUBLIC_*`) env vars safely during SSR and client builds.
 */
export function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    if (typeof process !== "undefined") {
      const fromProcess = process.env[key]?.trim();
      if (fromProcess) return fromProcess;
    }
    if (typeof import.meta !== "undefined" && import.meta.env) {
      const fromVite = (import.meta.env as Record<string, string | undefined>)[key]?.trim();
      if (fromVite) return fromVite;
    }
  }
  return undefined;
}

export function isDevEnv(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    return true;
  }
  return typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);
}
