import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchFredSeries, parseFredObservationsToLinePoints } from "./fred";

describe("FRED market data client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses ordered line points and skips missing values", () => {
    expect(
      parseFredObservationsToLinePoints({
        observations: [
          { date: "2025-01-03", value: "71.2" },
          { date: "2025-01-01", value: "." },
          { date: "2025-01-02", value: "70.4" },
        ],
      }),
    ).toEqual([
      { time: Math.floor(Date.parse("2025-01-02T12:00:00Z") / 1000), value: 70.4 },
      { time: Math.floor(Date.parse("2025-01-03T12:00:00Z") / 1000), value: 71.2 },
    ]);
  });

  it("maps proxy missing-key errors to the friendly missing_fred_key sentinel", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "missing_fred_key" } }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(fetchFredSeries("DCOILWTICO")).rejects.toThrow("missing_fred_key");
  });
});
