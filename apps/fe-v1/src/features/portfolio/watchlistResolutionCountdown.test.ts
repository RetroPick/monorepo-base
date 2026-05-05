import { describe, expect, it } from "vitest";

import { formatWatchlistResolveCountdown } from "./WatchlistResolutionCell";

describe("formatWatchlistResolveCountdown", () => {
  it("formats days and HH:MM:SS remainder", () => {
    const target = Date.UTC(2026, 0, 10, 12, 0, 0);
    const now = Date.UTC(2026, 0, 7, 10, 30, 45);
    expect(formatWatchlistResolveCountdown(target, now)).toBe("3d 01:29:15");
  });

  it("returns zero padding when under a day", () => {
    const target = Date.UTC(2026, 0, 1, 15, 2, 3);
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(formatWatchlistResolveCountdown(target, now)).toBe("0d 03:02:03");
  });
});
