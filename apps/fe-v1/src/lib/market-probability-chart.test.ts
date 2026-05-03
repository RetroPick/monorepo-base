import { describe, expect, it } from "vitest";

import type { ProbabilityHistoryPoint } from "@/lib/api/retropickApi";

import type { MarketOutcome } from "@/types/market";

import {
  appendSyntheticNowRow,
  applyEmaToRows,
  collapseRedundantProbabilityRows,
  downsampleProbabilityRowsForDisplay,
  filterRowsByTimeWindow,
  historyToChartRows,
  lastOutcomePercents,
  pickYesOutcome,
  presetSmoothingMode,
  presetToDurationMs,
  PROBABILITY_BINARY_GREEN,
  PROBABILITY_BINARY_RED,
  PROBABILITY_CHART_PRESETS,
  rowsToRechartsData,
  strokeColorsForProbabilityChart,
  takeRowsByIndices,
  windowDeltaPercent,
} from "./market-probability-chart";

function point(
  tIso: string,
  e6: [number, number],
  block = 1,
): ProbabilityHistoryPoint {
  return {
    blockNumber: block,
    txHash: "0x",
    logIndex: 0,
    eventName: "PositionDeposited",
    indexedAt: tIso,
    totalPool: "1",
    outcomes: [
      { outcomeIndex: 0, poolSize: "1", impliedProbabilityE6: String(e6[0]) },
      { outcomeIndex: 1, poolSize: "1", impliedProbabilityE6: String(e6[1]) },
    ],
  };
}

describe("presetToDurationMs", () => {
  it("all is unbounded", () => {
    expect(presetToDurationMs("all")).toBeNull();
  });
  it("15m", () => {
    expect(presetToDurationMs("15m")).toBe(15 * 60 * 1000);
  });
});

describe("historyToChartRows", () => {
  it("uses indexedAt for t and clamps non-monotonic timestamps", () => {
    const h = [
      point("2020-01-01T00:00:00.000Z", [500_000, 500_000], 1),
      point("2020-01-01T00:00:00.000Z", [600_000, 400_000], 2),
    ];
    const rows = historyToChartRows(h, ["0", "1"]);
    expect(rows[0].t).toBe(new Date(h[0].indexedAt!).getTime());
    expect(rows[1].t).toBe(rows[0].t + 1);
    expect(rows[1].outcomePercents["0"]).toBe(60);
  });
});

describe("filterRowsByTimeWindow", () => {
  it("returns all indices when window is null", () => {
    const rows = [{ t: 100 }, { t: 200 }];
    expect(filterRowsByTimeWindow(rows, 500, null)).toEqual([0, 1]);
  });
  it("keeps only rows inside the window", () => {
    const now = 1_000_000;
    const windowMs = 1000;
    const rows = [{ t: now - 500 }, { t: now - 2000 }, { t: now - 100 }];
    expect(filterRowsByTimeWindow(rows, now, windowMs)).toEqual([0, 2]);
  });
});

describe("appendSyntheticNowRow", () => {
  it("appends a flat extension when last trade is before now", () => {
    const rows = historyToChartRows([point("2020-01-01T00:00:00.000Z", [700_000, 300_000])], ["0", "1"]);
    const now = new Date("2020-01-02T00:00:00.000Z").getTime();
    const out = appendSyntheticNowRow(rows, ["0", "1"], now, { "0": 50, "1": 50 });
    expect(out).toHaveLength(2);
    expect(out[1].t).toBe(now);
    expect(out[1].isSyntheticNow).toBe(true);
    expect(out[1].outcomePercents["0"]).toBe(70);
    expect(out[0].isSyntheticNow).toBeUndefined();
  });

  it("does not duplicate when last point is already at or after now", () => {
    const rows = historyToChartRows([point("2020-01-02T00:00:00.000Z", [800_000, 200_000])], ["0", "1"]);
    const now = new Date("2020-01-01T00:00:00.000Z").getTime();
    const out = appendSyntheticNowRow(rows, ["0", "1"], now, {});
    expect(out).toHaveLength(1);
    expect(out[0].outcomePercents["0"]).toBe(80);
  });

  it("uses fallback when history is empty", () => {
    const out = appendSyntheticNowRow([], ["0", "1"], 1_000, { "0": 12, "1": 88 });
    expect(out).toHaveLength(1);
    expect(out[0].outcomePercents).toEqual({ "0": 12, "1": 88 });
    expect(out[0].isSyntheticNow).toBe(true);
  });

  it("uses liveImpliedPercents for synthetic tip when provided", () => {
    const rows = historyToChartRows([point("2020-01-01T00:00:00.000Z", [700_000, 300_000])], ["0", "1"]);
    const now = new Date("2020-01-02T00:00:00.000Z").getTime();
    const out = appendSyntheticNowRow(rows, ["0", "1"], now, { "0": 50, "1": 50 }, {
      liveImpliedPercents: { "0": 19, "1": 81 },
    });
    expect(out).toHaveLength(2);
    expect(out[1].isSyntheticNow).toBe(true);
    expect(out[1].outcomePercents["0"]).toBe(19);
    expect(out[1].outcomePercents["1"]).toBe(81);
  });
});

describe("rowsToRechartsData", () => {
  it("maps outcome keys and preserves synthetic flag", () => {
    const rows = appendSyntheticNowRow(
      historyToChartRows([point("2020-01-01T00:00:00.000Z", [500_000, 500_000])], ["0", "1"]),
      ["0", "1"],
      new Date("2020-01-03T00:00:00.000Z").getTime(),
      {},
    );
    const data = rowsToRechartsData(rows, ["0", "1"]);
    expect(data[1].outcome_0).toBe(50);
    expect(data[1].isSyntheticNow).toBe(true);
    expect(typeof data[0].t).toBe("number");
  });
});

describe("lastOutcomePercents", () => {
  it("reads last row or falls back", () => {
    expect(lastOutcomePercents([], ["0"], { "0": 3 })).toEqual({ "0": 3 });
    const rows = historyToChartRows([point("2020-01-01T00:00:00.000Z", [400_000, 600_000])], ["0", "1"]);
    expect(lastOutcomePercents(rows, ["0", "1"], {})).toEqual({ "0": 40, "1": 60 });
  });
});

describe("takeRowsByIndices", () => {
  it("projects rows", () => {
    const a = [{ x: 1 }, { x: 2 }, { x: 3 }];
    expect(takeRowsByIndices(a, [2, 0])).toEqual([{ x: 3 }, { x: 1 }]);
  });
});

describe("collapseRedundantProbabilityRows", () => {
  it("drops consecutive points with the same implied percentages", () => {
    const base = new Date("2020-01-01T00:00:00.000Z").getTime();
    const rows = [
      { t: base, indexedAtIso: null, blockNumber: 1, outcomePercents: { "0": 50, "1": 50 } },
      { t: base + 1, indexedAtIso: null, blockNumber: 2, outcomePercents: { "0": 50, "1": 50 } },
      { t: base + 2, indexedAtIso: null, blockNumber: 3, outcomePercents: { "0": 60, "1": 40 } },
    ];
    const out = collapseRedundantProbabilityRows(rows, ["0", "1"]);
    expect(out).toHaveLength(2);
    expect(out[1].outcomePercents["0"]).toBe(60);
  });
});

describe("downsampleProbabilityRowsForDisplay", () => {
  it("keeps every distinct point when count is under the raw cap", () => {
    const t0 = new Date("2020-01-01T00:00:00.000Z").getTime();
    const rows = [];
    for (let i = 0; i < 50; i++) {
      rows.push({
        t: t0 + i * 1000,
        indexedAtIso: null,
        blockNumber: i,
        outcomePercents: { "0": 50 + i, "1": 50 - i },
      });
    }
    const out = downsampleProbabilityRowsForDisplay(rows, ["0", "1"], {
      minBucketMs: 5_000,
      maxBuckets: 10,
    });
    expect(out).toHaveLength(rows.length);
    expect(out[out.length - 1].outcomePercents["0"]).toBe(99);
  });

  it("merges bursts into one point per time bucket when above raw cap", () => {
    const t0 = new Date("2020-01-01T00:00:00.000Z").getTime();
    const rows = [];
    for (let i = 0; i < 600; i++) {
      rows.push({
        t: t0 + i * 1000,
        indexedAtIso: null,
        blockNumber: i,
        outcomePercents: { "0": 50 + (i % 50), "1": 50 - (i % 50) },
      });
    }
    const out = downsampleProbabilityRowsForDisplay(rows, ["0", "1"], {
      minBucketMs: 5_000,
      maxBuckets: 10,
    });
    expect(out.length).toBeLessThan(rows.length);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it("merges when raw cap lowered via options (test hook)", () => {
    const t0 = new Date("2020-01-01T00:00:00.000Z").getTime();
    const rows = [];
    for (let i = 0; i < 50; i++) {
      rows.push({
        t: t0 + i * 1000,
        indexedAtIso: null,
        blockNumber: i,
        outcomePercents: { "0": 50 + i, "1": 50 - i },
      });
    }
    const out = downsampleProbabilityRowsForDisplay(rows, ["0", "1"], {
      minBucketMs: 5_000,
      maxBuckets: 10,
      maxRawPointsBeforeBucket: 10,
    });
    expect(out.length).toBeLessThan(rows.length);
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[out.length - 1].outcomePercents["0"]).toBe(99);
  });
});

describe("presetSmoothingMode", () => {
  it("uses EMA + monotone only on short presets", () => {
    expect(presetSmoothingMode("15m").ema).not.toBeNull();
    expect(presetSmoothingMode("15m").curve).toBe("monotone");
    expect(presetSmoothingMode("1h").ema).not.toBeNull();
    expect(presetSmoothingMode("6h").ema).not.toBeNull();
    expect(presetSmoothingMode("1d").ema).toBeNull();
    expect(presetSmoothingMode("1d").curve).toBe("monotone");
    expect(presetSmoothingMode("1w").ema).toBeNull();
    expect(presetSmoothingMode("1w").curve).toBe("linear");
    expect(presetSmoothingMode("1m").curve).toBe("linear");
    expect(presetSmoothingMode("all").curve).toBe("linear");
  });

  it("covers every preset without throwing", () => {
    for (const p of PROBABILITY_CHART_PRESETS) {
      const c = presetSmoothingMode(p);
      expect(c.minBucketMs).toBeGreaterThan(0);
      expect(c.maxBuckets).toBeGreaterThan(0);
      if (c.ema) {
        expect(c.ema.alpha).toBeGreaterThan(0);
        expect(c.ema.alpha).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("pickYesOutcome", () => {
  it("picks Yes side by id when labels are arbitrary", () => {
    const negative: MarketOutcome = { id: "no", label: "Side A", probability: 60 };
    const positive: MarketOutcome = { id: "yes", label: "Side B", probability: 40 };
    expect(pickYesOutcome([negative, positive]).id).toBe("yes");
  });

  it("picks Yes over No by label when ids are neutral", () => {
    const n: MarketOutcome = { id: "a", label: "No", probability: 70 };
    const y: MarketOutcome = { id: "b", label: "Yes", probability: 30 };
    expect(pickYesOutcome([n, y]).label).toBe("Yes");
  });

  it("picks Up over Down by id", () => {
    const down: MarketOutcome = { id: "down", label: "DOWN", probability: 55 };
    const up: MarketOutcome = { id: "up", label: "UP", probability: 45 };
    expect(pickYesOutcome([down, up]).id).toBe("up");
  });

  it("picks index 0 when labels are ambiguous", () => {
    const a: MarketOutcome = { id: "0", label: "Side A", probability: 30 };
    const b: MarketOutcome = { id: "1", label: "Side B", probability: 70 };
    expect(pickYesOutcome([b, a]).id).toBe("0");
  });
});

describe("applyEmaToRows", () => {
  it("leaves a flat series flat", () => {
    const t0 = 1_000_000;
    const rows = [
      { t: t0, indexedAtIso: null, blockNumber: 1, outcomePercents: { "0": 50, "1": 50 } },
      { t: t0 + 1000, indexedAtIso: null, blockNumber: 2, outcomePercents: { "0": 50, "1": 50 } },
      { t: t0 + 2000, indexedAtIso: null, blockNumber: 3, outcomePercents: { "0": 50, "1": 50 } },
    ];
    const alpha = 2 / 6;
    const out = applyEmaToRows(rows, ["0", "1"], alpha);
    expect(out.every((r) => r.outcomePercents["0"] === 50)).toBe(true);
    expect(out.every((r) => r.outcomePercents["1"] === 50)).toBe(true);
  });

  it("smooths a step without leaving [0,100]", () => {
    const t0 = 1_000_000;
    const rows = [
      { t: t0, indexedAtIso: null, blockNumber: 1, outcomePercents: { "0": 0 } },
      { t: t0 + 1000, indexedAtIso: null, blockNumber: 2, outcomePercents: { "0": 100 } },
      { t: t0 + 2000, indexedAtIso: null, blockNumber: 3, outcomePercents: { "0": 100 } },
    ];
    const alpha = 2 / 6;
    const out = applyEmaToRows(rows, ["0"], alpha);
    expect(out[0].outcomePercents["0"]).toBe(0);
    expect(out[1].outcomePercents["0"]).toBeGreaterThan(0);
    expect(out[1].outcomePercents["0"]).toBeLessThan(100);
    expect(out[2].outcomePercents["0"]).toBeLessThanOrEqual(100);
  });
});

describe("windowDeltaPercent", () => {
  it("returns 0 for fewer than 2 rows", () => {
    expect(windowDeltaPercent([], "0")).toBe(0);
    expect(windowDeltaPercent([{ outcomePercents: { "0": 40 } }], "0")).toBe(0);
  });

  it("returns rounded end minus start for yes id", () => {
    const rows = [
      { outcomePercents: { "0": 37 } },
      { outcomePercents: { "0": 55 } },
    ];
    expect(windowDeltaPercent(rows, "0")).toBe(18);
  });
});

describe("strokeColorsForProbabilityChart", () => {
  it("uses green/red for two outcome markets (chain indices)", () => {
    const all = [
      { id: "0", label: "Up", probability: 40 },
      { id: "1", label: "Down", probability: 60 },
    ];
    const top = [...all].sort((a, b) => b.probability - a.probability);
    const colors = strokeColorsForProbabilityChart(all, top);
    expect(colors[0]).toBe(PROBABILITY_BINARY_RED);
    expect(colors[1]).toBe(PROBABILITY_BINARY_GREEN);
  });

  it("uses green/red for discovery-style up/down ids", () => {
    const all = [
      { id: "up", label: "UP", probability: 55 },
      { id: "down", label: "DOWN", probability: 45 },
    ];
    const top = [...all].sort((a, b) => b.probability - a.probability);
    const colors = strokeColorsForProbabilityChart(all, top);
    expect(colors[0]).toBe(PROBABILITY_BINARY_GREEN);
    expect(colors[1]).toBe(PROBABILITY_BINARY_RED);
  });

  it("uses a multi palette by outcome index when there are 3+ outcomes", () => {
    const all = [
      { id: "0", label: "A", probability: 50 },
      { id: "1", label: "B", probability: 30 },
      { id: "2", label: "C", probability: 20 },
    ];
    const top = [...all].sort((a, b) => b.probability - a.probability);
    const colors = strokeColorsForProbabilityChart(all, top);
    expect(colors).toHaveLength(3);
    expect(new Set(colors).size).toBe(3);
  });
});
