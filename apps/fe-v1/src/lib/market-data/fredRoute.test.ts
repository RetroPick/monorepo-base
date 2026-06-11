import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../../app/api/fred/series/observations/route";

describe("FRED proxy route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 503 when the FRED API key is not configured", async () => {
    vi.stubEnv("FRED_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_FRED_API_KEY", "");

    const response = await GET(
      new Request("http://localhost/api/fred/series/observations?series_id=DCOILWTICO"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: {
        code: "missing_fred_key",
        message: "FRED API key is not configured",
      },
    });
  });

  it("proxies requests to FRED and injects the configured API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ observations: [{ date: "2025-01-01", value: "70.0" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("FRED_API_KEY", "server-secret");

    const response = await GET(
      new Request(
        "http://localhost/api/fred/series/observations?series_id=DCOILWTICO&api_key=client-bad&file_type=xml",
      ),
    );
    const upstream = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(response.status).toBe(200);
    expect(upstream.origin).toBe("https://api.stlouisfed.org");
    expect(upstream.pathname).toBe("/fred/series/observations");
    expect(upstream.searchParams.get("series_id")).toBe("DCOILWTICO");
    expect(upstream.searchParams.get("api_key")).toBe("server-secret");
    expect(upstream.searchParams.get("file_type")).toBe("json");
  });
});
