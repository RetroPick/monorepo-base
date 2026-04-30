import { afterEach, describe, expect, it, vi } from "vitest";

describe("runtime environment helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses Next public API URL before Vite API URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.next.example/");
    vi.stubEnv("VITE_API_URL", "https://api.vite.example/");

    const { getApiBaseUrl } = await import("./runtimeEnv");

    expect(getApiBaseUrl()).toBe("https://api.next.example");
  });

  it("falls back to local API URL when no public env is configured", async () => {
    const { getApiBaseUrl } = await import("./runtimeEnv");

    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8080");
  });

  it("fails closed instead of using local API URL in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { getApiBaseUrl } = await import("./runtimeEnv");

    expect(() => getApiBaseUrl()).toThrow("NEXT_PUBLIC_API_URL is not configured");
  });

  it("uses configured docs URL and trims trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_DOCS_URL", "https://docs.example.com/docs/");

    const { getDocsSiteUrl } = await import("./runtimeEnv");

    expect(getDocsSiteUrl()).toBe("https://docs.example.com/docs");
  });

  it("fails closed instead of using local docs URL in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { getDocsSiteUrl } = await import("./runtimeEnv");

    expect(() => getDocsSiteUrl()).toThrow("NEXT_PUBLIC_DOCS_URL is not configured");
  });

  it("disables demo relayer by default in production", async () => {
    vi.stubEnv("MODE", "production");

    const { getRelayerBaseUrl } = await import("./runtimeEnv");

    expect(() => getRelayerBaseUrl()).toThrow("Demo relayer is disabled");
  });
});
