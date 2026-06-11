import { useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getApiWebSocketUrl, type ChartCandle, type MarketDetail, type MarketRow, type ProbabilityHistoryResponse } from "@/lib/api/retropickApi";

const WS_STALE_MS = 12_000;
const WS_CURSOR_KEY = "retropick:ws-channel-cursors";

function normalizeWsTemplateId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

function parseNotifyTemplateIds(raw: string): string[] {
  try {
    const p = JSON.parse(raw) as { templateId?: string; templateIds?: string[] };
    const out: string[] = [];
    if (typeof p.templateId === "string") out.push(p.templateId);
    if (Array.isArray(p.templateIds)) {
      for (const id of p.templateIds) {
        if (typeof id === "string") out.push(id);
      }
    }
    const norm = (x: string) => normalizeWsTemplateId(x);
    const seen = new Set<string>();
    const dedup: string[] = [];
    for (const id of out) {
      const n = norm(id);
      if (n && !seen.has(n)) {
        seen.add(n);
        dedup.push(n);
      }
    }
    return dedup;
  } catch {
    return [];
  }
}

export type RealtimeEvent = {
  seq?: number;
  type?: string;
  channel?: string;
  templateId?: string;
  epochId?: number;
  payload?: Partial<MarketRow & MarketDetail> & {
    templateId?: string;
    epochId?: number;
    status?: string;
    blockNumber?: number;
    txHash?: string;
    logIndex?: number;
  };
};

function isUserChannel(channel: string | undefined): boolean {
  return typeof channel === "string" && channel.startsWith("user:");
}

function isDepositChannel(channel: string | undefined): boolean {
  return typeof channel === "string" && channel.startsWith("deposit:");
}

function isChartChannel(channel: string | undefined): boolean {
  return typeof channel === "string" && channel.startsWith("chart:");
}

function parseRealtimeEvent(raw: string): RealtimeEvent | null {
  try {
    const parsed = JSON.parse(raw) as RealtimeEvent;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function patchChartCaches(qc: QueryClient, event: RealtimeEvent): boolean {
  const payload = event.payload as {
    feedId?: string;
    intervalSec?: number;
    bucketStart?: string;
    closeE8?: string;
    source?: string;
  } | undefined;
  if (!payload?.feedId || !payload.intervalSec || !payload.bucketStart || !payload.closeE8) return false;

  qc.setQueriesData<{ feedId: string; intervalSec: number; candles: ChartCandle[] }>(
    { queryKey: ["retropick-api", "market-chart"] },
    (old) => {
      if (!old || old.feedId !== payload.feedId || old.intervalSec !== payload.intervalSec) return old;
      const existingIdx = old.candles.findIndex((c) => c.bucketStart === payload.bucketStart);
      const nextCandle: ChartCandle = existingIdx >= 0
        ? {
            ...old.candles[existingIdx],
            closeE8: payload.closeE8,
            highE8: old.candles[existingIdx]?.highE8 ?? payload.closeE8,
            lowE8: old.candles[existingIdx]?.lowE8 ?? payload.closeE8,
            source: payload.source ?? old.candles[existingIdx]?.source ?? "live",
          }
        : {
            feedId: payload.feedId,
            intervalSec: payload.intervalSec,
            bucketStart: payload.bucketStart,
            openE8: payload.closeE8,
            highE8: payload.closeE8,
            lowE8: payload.closeE8,
            closeE8: payload.closeE8,
            source: payload.source ?? "live",
            sampleCount: 1,
            updatedAt: new Date().toISOString(),
          };
      const candles = [...old.candles];
      if (existingIdx >= 0) candles[existingIdx] = nextCandle;
      else candles.unshift(nextCandle);
      return { ...old, candles };
    },
  );
  return true;
}

function mergeOutcomeViews<T extends { outcomeIndex: number; label?: string }>(
  existing: T[] | undefined,
  incoming: T[] | undefined,
): T[] | undefined {
  if (!incoming) return existing;
  if (!existing || existing.length === 0) return incoming;
  const existingByIndex = new Map(existing.map((outcome) => [outcome.outcomeIndex, outcome] as const));
  return incoming.map((outcome) => {
    const prior = existingByIndex.get(outcome.outcomeIndex);
    if (!prior) return outcome;
    return {
      ...prior,
      ...outcome,
      label: outcome.label ?? prior.label,
    };
  });
}

export function applyRealtimeEventToCaches(qc: QueryClient, event: RealtimeEvent): boolean {
  if (isChartChannel(event.channel) && patchChartCaches(qc, event)) return true;
  const payload = event.payload;
  const templateId = normalizeWsTemplateId(event.templateId ?? payload?.templateId);
  if (!templateId || !payload) return false;

  qc.setQueriesData<MarketRow[]>({ queryKey: ["retropick-api", "markets"] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((row) => {
      if (normalizeWsTemplateId(row.templateId) !== templateId) return row;
      const nextEpochStatus =
        typeof payload.epochStatus === "string"
          ? payload.epochStatus
          : typeof payload.status === "string"
            ? payload.status
            : row.epochStatus;
      return {
        ...row,
        activeEpochId: payload.activeEpochId ?? payload.epochId ?? event.epochId ?? row.activeEpochId,
        epochStatus: nextEpochStatus,
        totalPool: payload.totalPool ?? row.totalPool,
        volume: payload.volume ?? row.volume,
        outcomeCount: payload.outcomeCount ?? row.outcomeCount,
        outcomes: mergeOutcomeViews(row.outcomes, payload.outcomes),
        outcomeViewBlock: payload.lastIndexedBlock ?? payload.blockNumber ?? row.outcomeViewBlock,
        lastIndexedBlock: payload.lastIndexedBlock ?? payload.blockNumber ?? row.lastIndexedBlock,
      };
    });
  });

  qc.setQueriesData<MarketDetail>({ queryKey: ["retropick-api", "market", templateId] }, (old) => {
    if (!old) return old;
    return {
      ...old,
      activeEpochId: payload.activeEpochId ?? payload.epochId ?? event.epochId ?? old.activeEpochId,
      epochStatus:
        typeof payload.epochStatus === "string"
          ? payload.epochStatus
          : typeof payload.status === "string"
            ? payload.status
            : old.epochStatus,
      totalPool: payload.totalPool ?? old.totalPool,
      volume: payload.volume ?? old.volume,
      outcomeCount: payload.outcomeCount ?? old.outcomeCount,
      outcomes: mergeOutcomeViews(old.outcomes, payload.outcomes),
      outcomeViewBlock: payload.lastIndexedBlock ?? payload.blockNumber ?? old.outcomeViewBlock,
      lastIndexedBlock: payload.lastIndexedBlock ?? payload.blockNumber ?? old.lastIndexedBlock,
    };
  });

  if (payload.outcomes && payload.blockNumber != null && payload.txHash && payload.logIndex != null) {
    qc.setQueriesData<ProbabilityHistoryResponse>(
      { queryKey: ["retropick-api", "probability-history", templateId] },
      (old) => {
        if (!old) return old;
        const epochId = payload.epochId ?? event.epochId ?? old.epochId;
        if (epochId !== old.epochId) return old;
        const exists = old.points.some(
          (point) => point.txHash === payload.txHash && point.logIndex === payload.logIndex,
        );
        if (exists) return old;
        const totalPool = payload.totalPool ?? old.points.at(-1)?.totalPool ?? "0";
        return {
          ...old,
          points: [
            ...old.points,
            {
              blockNumber: payload.blockNumber,
              txHash: payload.txHash,
              logIndex: payload.logIndex,
              eventName: event.type ?? "pool_update",
              totalPool,
              outcomes: payload.outcomes.map((outcome) => ({
                outcomeIndex: outcome.outcomeIndex,
                poolSize: outcome.poolSize,
                impliedProbabilityE6: outcome.impliedProbabilityE6,
              })),
            },
          ],
        };
      },
    );
  }

  return true;
}

function shouldImmediatelyRefetchScopedMarket(event: RealtimeEvent): boolean {
  switch (event.type) {
    case "pool_update":
    case "epoch_opened":
    case "epoch_locked":
    case "epoch_resolved":
    case "claim_update":
      return true;
    default:
      return false;
  }
}

export function syncRealtimeEventToCaches(qc: QueryClient, event: RealtimeEvent): boolean {
  const patched = applyRealtimeEventToCaches(qc, event);
  if (!patched) return false;

  const templateId = normalizeWsTemplateId(event.templateId ?? event.payload?.templateId);
  if (templateId && shouldImmediatelyRefetchScopedMarket(event)) {
    void qc.invalidateQueries({ queryKey: ["retropick-api", "market", templateId] });
    void qc.invalidateQueries({ queryKey: ["retropick-api", "epochs", templateId] });
    void qc.invalidateQueries({ queryKey: ["retropick-api", "probability-history", templateId] });
  }

  return true;
}

/** Refetch probability history immediately so the chart updates without waiting for the debounced batch. */
function invalidateProbabilityHistoryNow(qc: QueryClient, templateId?: string) {
  const t = normalizeWsTemplateId(templateId);
  if (t) {
    void qc.invalidateQueries({ queryKey: ["retropick-api", "probability-history", t] });
  } else {
    void qc.invalidateQueries({ queryKey: ["retropick-api", "probability-history"] });
  }
}

export function loadChannelCursorMap(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WS_CURSOR_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [channel, seq] of Object.entries(parsed)) {
      if (typeof seq === "number" && Number.isFinite(seq) && seq > 0) out[channel] = seq;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveChannelCursorMap(cursors: Record<string, number>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WS_CURSOR_KEY, JSON.stringify(cursors));
}

/**
 * Subscribes to the backend `/ws` fanout (Postgres NOTIFY).
 * Probability history is invalidated immediately; other `retropick-api` queries are debounced.
 * Scoped pages ignore NOTIFY payloads that only mention other template IDs when `templateIds` is present.
 */
export function useIndexerWebSocket(enabled = true, scopeTemplateId?: string, primaryFeedId?: string) {
  const qc = useQueryClient();
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scope = normalizeWsTemplateId(scopeTemplateId);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let closed = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cursorByChannel = loadChannelCursorMap();
    let lastSeq = Math.max(0, ...Object.values(cursorByChannel), Number(window.localStorage.getItem("retropick:last-ws-seq") ?? "0") || 0);

    const scheduleInvalidate = (templateId?: string, event?: RealtimeEvent) => {
      invalidateProbabilityHistoryNow(qc, templateId);

      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => {
        const t = normalizeWsTemplateId(templateId);
        if (t) {
          void qc.invalidateQueries({ queryKey: ["retropick-api", "market", t] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "epochs", t] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "markets"] });
          if (isChartChannel(event?.channel)) {
            void qc.invalidateQueries({ queryKey: ["retropick-api", "market-chart", t] });
          }
          if (isUserChannel(event?.channel) || isDepositChannel(event?.channel)) {
            void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions"] });
            void qc.invalidateQueries({ queryKey: ["retropick-api", "user-claims"] });
            void qc.invalidateQueries({ queryKey: ["retropick-api", "user-events"] });
            void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary"] });
            void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist"] });
            void qc.invalidateQueries({ queryKey: ["retropick-api", "user-balance"] });
          }
        } else {
          void qc.invalidateQueries({ queryKey: ["retropick-api", "markets"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "market-chart"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "probability-history"] });
        }
      }, WS_STALE_MS);
    };

    const connect = () => {
      if (closed) return;
      try {
        const url = new URL(getApiWebSocketUrl());
        if (lastSeq > 0) url.searchParams.set("lastSeq", String(lastSeq));
        ws = new WebSocket(url.toString());
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        retryAttempt = 0;
        setConnected(true);
        const channels = scope ? ["global:markets", `market:${scope}`] : ["global:markets"];
        if (primaryFeedId) channels.push(`chart:${primaryFeedId.toLowerCase()}`);
        const scopedCursors = Object.fromEntries(channels.map((channel) => [channel, cursorByChannel[channel] ?? 0]));
        ws?.send(JSON.stringify({ type: "subscribe", channels, lastSeq, cursorByChannel: scopedCursors }));
      };

      ws.onmessage = (ev) => {
        retryAttempt = 0;
        const raw = String(ev.data);
        const realtimeEvent = parseRealtimeEvent(raw);
        if (realtimeEvent?.seq != null) {
          if (realtimeEvent.channel) {
            cursorByChannel = { ...cursorByChannel, [realtimeEvent.channel]: Math.max(cursorByChannel[realtimeEvent.channel] ?? 0, realtimeEvent.seq) };
            saveChannelCursorMap(cursorByChannel);
          }
          if (lastSeq > 0 && realtimeEvent.seq > lastSeq + 1) {
            scheduleInvalidate(scope, realtimeEvent);
          }
          lastSeq = Math.max(lastSeq, realtimeEvent.seq);
          window.localStorage.setItem("retropick:last-ws-seq", String(lastSeq));
        }
        if (realtimeEvent?.type === "resync_required") {
          scheduleInvalidate(scope, realtimeEvent);
          return;
        }
        if (realtimeEvent && syncRealtimeEventToCaches(qc, realtimeEvent)) {
          return;
        }

        const ids = parseNotifyTemplateIds(raw);

        if (scope) {
          if (ids.length === 0) {
            scheduleInvalidate(scope, realtimeEvent);
            return;
          }
          if (!ids.some((id) => id === scope)) return;
          scheduleInvalidate(scope, realtimeEvent);
          return;
        }

        scheduleInvalidate(undefined, realtimeEvent ?? undefined);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closed) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        setConnected(false);
        ws?.close();
      };
    };

    const scheduleReconnect = () => {
      if (closed || retryTimer) return;
      const delayMs = Math.min(30_000, 2_000 * 2 ** Math.min(retryAttempt, 4));
      retryAttempt += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delayMs + Math.floor(Math.random() * 500));
    };

    connect();

    return () => {
      closed = true;
      setConnected(false);
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [enabled, primaryFeedId, qc, scope]);

  return { connected };
}
