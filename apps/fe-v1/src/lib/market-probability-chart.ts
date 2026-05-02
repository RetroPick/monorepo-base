import type { ProbabilityHistoryPoint } from "@/lib/api/retropickApi";
import type { MarketOutcome } from "@/types/market";

/** Binary markets: “positive” side (Up / Yes / index 0). */
export const PROBABILITY_BINARY_GREEN = "#22c55e";
/** Binary markets: “negative” side (Down / No / index 1). */
export const PROBABILITY_BINARY_RED = "#ef4444";

/** Multi-outcome markets: distinct hues per outcome index. */
export const PROBABILITY_MULTI_PALETTE = [
  "#06b6d4",
  "#8b5cf6",
  "#eab308",
  "#f97316",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
] as const;

/** Higher = sort first (green). Lower = red. */
function binaryPositiveScore(o: MarketOutcome): number {
  const id = String(o.id).toLowerCase();
  const lab = o.label.toLowerCase();
  if (id === "0" || id === "up" || id === "yes") {
    return 2;
  }
  if (id === "1" || id === "down" || id === "no") {
    return -2;
  }
  if (/\bup\b|^up\b|\byes\b/.test(lab)) {
    return 1;
  }
  if (/\bdown\b|^down\b/.test(lab)) {
    return -1;
  }
  const n = Number(o.id);
  if (Number.isFinite(n)) {
    if (n === 0) {
      return 2;
    }
    if (n === 1) {
      return -2;
    }
  }
  return 0;
}

function binaryOutcomeSort(a: MarketOutcome, b: MarketOutcome): number {
  const d = binaryPositiveScore(b) - binaryPositiveScore(a);
  if (d !== 0) {
    return d;
  }
  return String(a.id).localeCompare(String(b.id));
}

/**
 * Stroke colors for the top-N series: binary → green/red by side; 3+ outcomes → palette by full-list index.
 */
export function strokeColorsForProbabilityChart(allOutcomes: MarketOutcome[], topOutcomes: MarketOutcome[]): string[] {
  const total = allOutcomes.length;
  if (total === 2) {
    const ordered = [...allOutcomes].sort(binaryOutcomeSort);
    const map = new Map<string, string>([
      [String(ordered[0].id), PROBABILITY_BINARY_GREEN],
      [String(ordered[1].id), PROBABILITY_BINARY_RED],
    ]);
    return topOutcomes.map((o) => map.get(String(o.id)) ?? PROBABILITY_BINARY_GREEN);
  }
  const indexById = new Map(allOutcomes.map((o, i) => [String(o.id), i]));
  return topOutcomes.map((o) => {
    const idx = indexById.get(String(o.id)) ?? 0;
    return PROBABILITY_MULTI_PALETTE[idx % PROBABILITY_MULTI_PALETTE.length];
  });
}

export const PROBABILITY_CHART_PRESETS = ["15m", "1h", "6h", "1d", "1w", "1m", "all"] as const;
export type ProbabilityChartPreset = (typeof PROBABILITY_CHART_PRESETS)[number];

export const PROBABILITY_CHART_PRESET_LABEL: Record<ProbabilityChartPreset, string> = {
  "15m": "15m",
  "1h": "1H",
  "6h": "6H",
  "1d": "1D",
  "1w": "1W",
  "1m": "1M",
  all: "ALL",
};

export function presetToDurationMs(preset: ProbabilityChartPreset): number | null {
  switch (preset) {
    case "15m":
      return 15 * 60 * 1000;
    case "1h":
      return 60 * 60 * 1000;
    case "6h":
      return 6 * 60 * 60 * 1000;
    case "1d":
      return 24 * 60 * 60 * 1000;
    case "1w":
      return 7 * 24 * 60 * 60 * 1000;
    case "1m":
      return 30 * 24 * 60 * 60 * 1000;
    case "all":
      return null;
    default: {
      const _x: never = preset;
      return _x;
    }
  }
}

export type ProbabilityChartRow = {
  t: number;
  indexedAtIso: string | null;
  blockNumber: number;
  outcomePercents: Record<string, number>;
  isSyntheticNow?: boolean;
};

function outcomePercentsForPoint(point: ProbabilityHistoryPoint, sortedOutcomeIds: string[]): Record<string, number> {
  const outcomePercents: Record<string, number> = {};
  for (const id of sortedOutcomeIds) {
    const outcomeIndex = Number(id);
    const histOutcome = point.outcomes.find((o) => o.outcomeIndex === outcomeIndex);
    const p = histOutcome ? Number(histOutcome.impliedProbabilityE6) / 10_000 : 0;
    outcomePercents[id] = Math.max(0, Math.min(100, p));
  }
  return outcomePercents;
}

/**
 * Maps each event to `t` in epoch ms. Duplicate `indexedAt` values are nudged by +1ms so rows stay strictly ordered;
 * on long spans that still yields ~vertical segments — use `downsampleProbabilityRowsForDisplay` before drawing.
 */
export function historyToChartRows(
  history: ProbabilityHistoryPoint[],
  sortedOutcomeIds: string[],
): Omit<ProbabilityChartRow, "isSyntheticNow">[] {
  let lastT = 0;
  return history.map((point) => {
    let t = point.indexedAt ? new Date(point.indexedAt).getTime() : NaN;
    if (!Number.isFinite(t) || t <= 0) {
      t = lastT + 1;
    }
    if (t <= lastT) {
      t = lastT + 1;
    }
    lastT = t;
    return {
      t,
      indexedAtIso: point.indexedAt ?? null,
      blockNumber: point.blockNumber,
      outcomePercents: outcomePercentsForPoint(point, sortedOutcomeIds),
    };
  });
}

function outcomePercentsNearEqual(
  a: Record<string, number>,
  b: Record<string, number>,
  sortedOutcomeIds: string[],
  eps = 0.02,
): boolean {
  return sortedOutcomeIds.every((id) => Math.abs((a[id] ?? 0) - (b[id] ?? 0)) <= eps);
}

/** Drops consecutive points with the same implied % (no visual change; shrinks artificial 1ms staircases). */
export function collapseRedundantProbabilityRows(
  rows: Omit<ProbabilityChartRow, "isSyntheticNow">[],
  sortedOutcomeIds: string[],
): Omit<ProbabilityChartRow, "isSyntheticNow">[] {
  const out: Omit<ProbabilityChartRow, "isSyntheticNow">[] = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    if (prev && outcomePercentsNearEqual(prev.outcomePercents, row.outcomePercents, sortedOutcomeIds)) {
      continue;
    }
    out.push({ ...row });
  }
  return out;
}

/**
 * One sample per wall-clock bucket (last event in bucket wins). Dense indexer bursts collapse to a single point per bucket.
 */
export function bucketMergeProbabilityRows(
  rows: Omit<ProbabilityChartRow, "isSyntheticNow">[],
  bucketMs: number,
): Omit<ProbabilityChartRow, "isSyntheticNow">[] {
  if (rows.length === 0) {
    return [];
  }
  if (rows.length === 1 || bucketMs <= 0) {
    return rows.map((r) => ({ ...r }));
  }
  const t0 = rows[0].t;
  const out: Omit<ProbabilityChartRow, "isSyntheticNow">[] = [];
  let currentBucket = Math.floor((rows[0].t - t0) / bucketMs);
  let lastInBucket = rows[0];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const b = Math.floor((row.t - t0) / bucketMs);
    if (b !== currentBucket) {
      out.push({ ...lastInBucket });
      currentBucket = b;
    }
    lastInBucket = row;
  }
  out.push({ ...lastInBucket });
  return out;
}

/** Below this count (after redundant collapse), keep every point — matches V1 “raw is fine, limit 500”. */
export const PROBABILITY_CHART_RAW_POINT_CAP = 500;

export type DownsampleProbabilityRowsOptions = {
  /** Floor on bucket width in real milliseconds (default 12_000). */
  minBucketMs?: number;
  /** Target number of buckets across the series (default 160). */
  maxBuckets?: number;
  /**
   * Skip time-bucketing when collapsed row count is at most this (default PROBABILITY_CHART_RAW_POINT_CAP).
   * Set lower in tests to force bucketing.
   */
  maxRawPointsBeforeBucket?: number;
};

/** Collapse redundant Y, then optionally merge into ~maxBuckets time buckets when point count exceeds cap. */
export function downsampleProbabilityRowsForDisplay(
  rows: Omit<ProbabilityChartRow, "isSyntheticNow">[],
  sortedOutcomeIds: string[],
  options?: DownsampleProbabilityRowsOptions,
): Omit<ProbabilityChartRow, "isSyntheticNow">[] {
  const collapsed = collapseRedundantProbabilityRows(rows, sortedOutcomeIds);
  if (collapsed.length <= 2) {
    return collapsed;
  }
  const rawCap = options?.maxRawPointsBeforeBucket ?? PROBABILITY_CHART_RAW_POINT_CAP;
  if (collapsed.length <= rawCap) {
    return collapsed;
  }
  const minBucket = options?.minBucketMs ?? 12_000;
  const maxBuckets = options?.maxBuckets ?? 160;
  const t0 = collapsed[0].t;
  const t1 = collapsed[collapsed.length - 1].t;
  const spanMs = t1 - t0;
  if (spanMs <= 0) {
    return collapsed;
  }
  const idealBucket = Math.ceil(spanMs / maxBuckets);
  const bucketMs = Math.max(minBucket, idealBucket);
  return bucketMergeProbabilityRows(collapsed, bucketMs);
}

export function filterRowsByTimeWindow(
  rows: Pick<ProbabilityChartRow, "t">[],
  nowMs: number,
  windowMs: number | null,
): number[] {
  if (windowMs == null) {
    return rows.map((_, i) => i);
  }
  const cutoff = nowMs - windowMs;
  const idx: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].t >= cutoff) {
      idx.push(i);
    }
  }
  return idx;
}

export function takeRowsByIndices<T>(rows: T[], indices: number[]): T[] {
  return indices.map((i) => rows[i]);
}

export function lastOutcomePercents(
  rows: Pick<ProbabilityChartRow, "outcomePercents">[],
  sortedOutcomeIds: string[],
  fallback: Record<string, number>,
): Record<string, number> {
  const last = rows[rows.length - 1];
  if (!last) {
    return { ...fallback };
  }
  const o: Record<string, number> = {};
  for (const id of sortedOutcomeIds) {
    o[id] = last.outcomePercents[id] ?? fallback[id] ?? 0;
  }
  return o;
}

/** Extends the series to `nowMs` with flat probabilities when the last trade is older than now. */
export function appendSyntheticNowRow(
  rows: Omit<ProbabilityChartRow, "isSyntheticNow">[],
  sortedOutcomeIds: string[],
  nowMs: number,
  fallbackPercents: Record<string, number>,
): ProbabilityChartRow[] {
  const base = lastOutcomePercents(rows, sortedOutcomeIds, fallbackPercents);
  const last = rows[rows.length - 1];
  const synthetic: ProbabilityChartRow = {
    t: nowMs,
    indexedAtIso: null,
    blockNumber: last?.blockNumber ?? 0,
    outcomePercents: base,
    isSyntheticNow: true,
  };
  if (rows.length === 0) {
    return [synthetic];
  }
  if (last && last.t >= nowMs) {
    return rows.map((r) => ({ ...r }));
  }
  return [...rows.map((r) => ({ ...r })), synthetic];
}

export type RechartsProbabilityDatum = Record<string, string | number | boolean | undefined>;

export function rowsToRechartsData(rows: ProbabilityChartRow[], sortedOutcomeIds: string[]): RechartsProbabilityDatum[] {
  return rows.map((r) => {
    const row: RechartsProbabilityDatum = {
      t: r.t,
      isSyntheticNow: Boolean(r.isSyntheticNow),
    };
    for (const id of sortedOutcomeIds) {
      row[`outcome_${id}`] = r.outcomePercents[id] ?? 0;
    }
    return row;
  });
}
