import { describe, expect, it } from "vitest";
import { parseFrankfurterRatesToLinePoints, type FrankfurterTimeSeriesResponse } from "./frankfurter";
import { parseFredObservationsToLinePoints, type FredObservationsResponse } from "./fred";
import { parseOpenMeteoDailyMaxTemps, type OpenMeteoArchiveDaily } from "./open-meteo";

describe("parseFrankfurterRatesToLinePoints", () => {
  it("maps daily USD quote to unix seconds and sorts", () => {
    const json: FrankfurterTimeSeriesResponse = {
      base: "EUR",
      rates: {
        "2024-01-02": { USD: 1.1 },
        "2024-01-01": { USD: 1.0 },
      },
    };
    const pts = parseFrankfurterRatesToLinePoints(json, "USD");
    expect(pts).toHaveLength(2);
    expect(pts[0].value).toBe(1.0);
    expect(pts[1].value).toBe(1.1);
    expect(pts[0].time).toBeLessThan(pts[1].time);
  });

  it("returns empty for missing rates", () => {
    expect(parseFrankfurterRatesToLinePoints({}, "USD")).toEqual([]);
  });
});

describe("parseFredObservationsToLinePoints", () => {
  it("skips missing dots and parses numeric values", () => {
    const json: FredObservationsResponse = {
      observations: [
        { date: "2020-01-01", value: "." },
        { date: "2020-01-02", value: "3.5" },
      ],
    };
    const pts = parseFredObservationsToLinePoints(json);
    expect(pts).toHaveLength(1);
    expect(pts[0].value).toBe(3.5);
  });
});

describe("parseOpenMeteoDailyMaxTemps", () => {
  it("pairs time array with temperature array", () => {
    const json: OpenMeteoArchiveDaily = {
      daily: {
        time: ["2024-06-01", "2024-06-02"],
        temperature_2m_max: [22.5, null],
      },
    };
    const pts = parseOpenMeteoDailyMaxTemps(json);
    expect(pts).toHaveLength(1);
    expect(pts[0].value).toBe(22.5);
  });
});
