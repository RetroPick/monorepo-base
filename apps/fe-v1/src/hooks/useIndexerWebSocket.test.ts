import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { MarketDetail, MarketRow, ProbabilityHistoryResponse } from "@/lib/api/retropickApi";
import { applyRealtimeEventToCaches, loadChannelCursorMap, saveChannelCursorMap, syncRealtimeEventToCaches } from "./useIndexerWebSocket";

describe("applyRealtimeEventToCaches", () => {
  it("patches markets, detail, and probability history caches directly", () => {
    const qc = new QueryClient();
    const templateId = "0xabc";

    qc.setQueryData<MarketRow[]>(["retropick-api", "markets"], [
      {
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
        epochStatus: "open",
        outcomes: [
          { outcomeIndex: 0, label: "Yes", poolSize: "50", impliedProbabilityE6: "500000" },
          { outcomeIndex: 1, label: "No", poolSize: "50", impliedProbabilityE6: "500000" },
        ],
      },
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
      epochStatus: "open",
      outcomes: [
        { outcomeIndex: 0, label: "Yes", poolSize: "50", impliedProbabilityE6: "500000" },
        { outcomeIndex: 1, label: "No", poolSize: "50", impliedProbabilityE6: "500000" },
      ],
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
        status: "locked",
        outcomes: [
          { outcomeIndex: 0, poolSize: "60", impliedProbabilityE6: "600000" },
          { outcomeIndex: 1, poolSize: "40", impliedProbabilityE6: "400000" },
        ],
      },
    });

    expect(patched).toBe(true);
    expect(qc.getQueryData<MarketRow[]>(["retropick-api", "markets"])?.[0]?.volume).toBe("250");
    expect(qc.getQueryData<MarketDetail>(["retropick-api", "market", templateId])?.totalPool).toBe("100");
    expect(qc.getQueryData<MarketRow[]>(["retropick-api", "markets"])?.[0]?.epochStatus).toBe("locked");
    expect(qc.getQueryData<MarketDetail>(["retropick-api", "market", templateId])?.epochStatus).toBe("locked");
    expect(qc.getQueryData<MarketRow[]>(["retropick-api", "markets"])?.[0]?.outcomes?.[0]?.label).toBe("Yes");
    expect(qc.getQueryData<MarketDetail>(["retropick-api", "market", templateId])?.outcomes?.[0]?.label).toBe("Yes");
    expect(qc.getQueryData<ProbabilityHistoryResponse>(["retropick-api", "probability-history", templateId])?.points).toHaveLength(1);
  });

  it("patches probability history caches that are keyed by template and epoch", () => {
    const qc = new QueryClient();
    const templateId = "0xabc";
    const epochId = 7;

    qc.setQueryData<ProbabilityHistoryResponse>(
      ["retropick-api", "probability-history", templateId, epochId],
      {
        templateId,
        epochId,
        outcomeCount: 2,
        source: "probability_points",
        points: [],
      },
    );

    const patched = applyRealtimeEventToCaches(qc, {
      type: "pool_update",
      channel: `market:${templateId}`,
      templateId,
      epochId,
      payload: {
        templateId,
        epochId,
        totalPool: "100",
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
    expect(
      qc.getQueryData<ProbabilityHistoryResponse>([
        "retropick-api",
        "probability-history",
        templateId,
        epochId,
      ])?.points,
    ).toHaveLength(1);
  });

  it("immediately invalidates scoped market queries after a pool update", () => {
    const qc = new QueryClient();
    const templateId = "0xabc";
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    qc.setQueryData<MarketRow[]>(["retropick-api", "markets"], [
      {
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
        outcomes: [
          { outcomeIndex: 0, label: "Yes", poolSize: "50", impliedProbabilityE6: "500000" },
          { outcomeIndex: 1, label: "No", poolSize: "50", impliedProbabilityE6: "500000" },
        ],
      },
    ]);

    const patched = syncRealtimeEventToCaches(qc, {
      type: "pool_update",
      channel: `market:${templateId}`,
      templateId,
      epochId: 7,
      payload: {
        templateId,
        epochId: 7,
        totalPool: "100",
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
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["retropick-api", "market", templateId] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["retropick-api", "epochs", templateId] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["retropick-api", "probability-history", templateId] });
  });
});

describe("channel cursor map", () => {
  it("round-trips per-channel sequence cursors", () => {
    localStorage.clear();
    saveChannelCursorMap({ "global:markets": 4, "market:0xabc": 9 });
    expect(loadChannelCursorMap()).toEqual({ "global:markets": 4, "market:0xabc": 9 });
  });
});
