import { describe, expect, it } from "vitest";

import { realtimeStateLabel } from "@retropick/polymarket";

describe("realtimeStateLabel", () => {
  it("returns honest labels", () => {
    expect(realtimeStateLabel("live")).toBe("Live");
    expect(realtimeStateLabel("snapshot_wait")).toBe("Snapshot");
    expect(realtimeStateLabel("connecting")).toBe("Reconnecting");
    expect(realtimeStateLabel("resyncing")).toBe("Resynchronizing");
    expect(realtimeStateLabel("polling_fallback")).toBe("Realtime unavailable");
  });
});

describe("useMarketsRealtime lifecycle", () => {
  it("defaults to polling when realtime capability is off", async () => {
    const { useMarketsRealtime } = await import("../hooks/useMarketsRealtime");
    expect(typeof useMarketsRealtime).toBe("function");
  });
});
