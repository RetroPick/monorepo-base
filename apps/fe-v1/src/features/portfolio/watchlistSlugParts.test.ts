import { describe, expect, it } from "vitest";

import { parseWatchlistSlug } from "./watchlistSlugParts";

describe("parseWatchlistSlug", () => {
  it("parses rolling threshold with pool", () => {
    expect(parseWatchlistSlug("rolling-threshold-link-usd-4d-v2")).toEqual({
      typeLabel: "Rolling Threshold",
      marketLabel: "LINK-USD",
      resolutionLabel: "4D",
      poolLabel: "V2",
    });
  });

  it("parses manual direction without pool", () => {
    expect(parseWatchlistSlug("manual-direction-btc-usd-4d")).toEqual({
      typeLabel: "Manual Direction",
      marketLabel: "BTC-USD",
      resolutionLabel: "4D",
      poolLabel: "-",
    });
  });

  it("parses manual range close", () => {
    expect(parseWatchlistSlug("manual-range-close-btc-usd-4d")).toEqual({
      typeLabel: "Manual Range Close",
      marketLabel: "BTC-USD",
      resolutionLabel: "4D",
      poolLabel: "-",
    });
  });
});
