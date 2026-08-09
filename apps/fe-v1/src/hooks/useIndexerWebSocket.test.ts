import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { MarketDetail, MarketRow, ProbabilityHistoryResponse } from "@/lib/api/retropickApi";
import { applyRealtimeEventToCaches, loadChannelCursorMap, saveChannelCursorMap } from "./useIndexerWebSocket";

describe("applyRealtimeEventToCaches", () => {
  it("patches markets, detail, and probability history caches directly", () => {
    const qc = new QueryClient();
    const templateId = "0xabc";

    qc.setQueryData<MarketRow[]>(["retropick-api", "markets"], [
      { templateId, slug: "btc", marketType: 1, outcomeCount: 2, initialized: true, executionMode: 0, rollingPhase: 0, rollingHaltReason: 0, lastIndexedBlock: 1, lastIndexedAt: null },
    ]);
    qc.setQueryData<MarketDetail>(["retropick-api", "market", templateId], {
      templateId,
      slug: "btc",
      marketType: 1,
      outcomeCount: 2,
      initialized: true,
      executionMode: 0,
      rollingPhase: 0,
      rollingHaltReason: 0,
      lastIndexedBlock: 1,
      lastIndexedAt: null,
    });
    qc.setQueryData<ProbabilityHistoryResponse>(["retropick-api", "probability-history", templateId], {
      templateId,
      epochId: 7,
      outcomeCount: 2,
      source: "probability_points",
      points: [],
    });

    const patched = applyRealtimeEventToCaches(qc, {
      type: "pool_update",
      channel: `market:${templateId}`,
      templateId,
      epochId: 7,
      payload: {
        templateId,
        epochId: 7,
        totalPool: "100",
        volume: "250",
        outcomeCount: 2,
        lastIndexedBlock: 55,
        blockNumber: 55,
        txHash: "0xtx",
        logIndex: 2,
        outcomes: [
          { outcomeIndex: 0, poolSize: "60", impliedProbabilityE6: "600000" },
          { outcomeIndex: 1, poolSize: "40", impliedProbabilityE6: "400000" },
        ],
      },
    });

    expect(patched).toBe(true);
    expect(qc.getQueryData<MarketRow[]>(["retropick-api", "markets"])?.[0]?.volume).toBe("250");
    expect(qc.getQueryData<MarketDetail>(["retropick-api", "market", templateId])?.totalPool).toBe("100");
    expect(qc.getQueryData<ProbabilityHistoryResponse>(["retropick-api", "probability-history", templateId])?.points).toHaveLength(1);
  });
});

describe("channel cursor map", () => {
  it("round-trips per-channel sequence cursors", () => {
    localStorage.clear();
    saveChannelCursorMap({ "global:markets": 4, "market:0xabc": 9 });
    expect(loadChannelCursorMap()).toEqual({ "global:markets": 4, "market:0xabc": 9 });
  });
});
