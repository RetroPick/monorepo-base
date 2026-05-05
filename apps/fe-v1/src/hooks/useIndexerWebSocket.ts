import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getApiWebSocketUrl, type MarketDetail, type MarketRow, type ProbabilityHistoryResponse } from "@/lib/api/retropickApi";

const WS_STALE_MS = 12_000;

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

type RealtimeEvent = {
  seq?: number;
  type?: string;
  channel?: string;
  templateId?: string;
  epochId?: number;
  payload?: Partial<MarketRow & MarketDetail> & {
    templateId?: string;
    epochId?: number;
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

function patchMarketCaches(qc: QueryClient, event: RealtimeEvent): boolean {
  const payload = event.payload;
  const templateId = normalizeWsTemplateId(event.templateId ?? payload?.templateId);
  if (!templateId || !payload) return false;

  const patch: Partial<MarketRow & MarketDetail> = {
    activeEpochId: payload.activeEpochId ?? payload.epochId ?? event.epochId,
    totalPool: payload.totalPool,
    volume: payload.volume,
    outcomeCount: payload.outcomeCount,
    outcomes: payload.outcomes,
    outcomeViewBlock: payload.lastIndexedBlock ?? payload.blockNumber,
    lastIndexedBlock: payload.lastIndexedBlock ?? payload.blockNumber,
  };

  qc.setQueriesData<MarketRow[]>({ queryKey: ["retropick-api", "markets"] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((row) => (normalizeWsTemplateId(row.templateId) === templateId ? { ...row, ...patch } : row));
  });

  qc.setQueriesData<MarketDetail>({ queryKey: ["retropick-api", "market", templateId] }, (old) => {
    if (!old) return old;
    return { ...old, ...patch };
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

/** Refetch probability history immediately so the chart updates without waiting for the debounced batch. */
function invalidateProbabilityHistoryNow(qc: QueryClient, templateId?: string) {
  const t = normalizeWsTemplateId(templateId);
  if (t) {
    void qc.invalidateQueries({ queryKey: ["retropick-api", "probability-history", t] });
  } else {
    void qc.invalidateQueries({ queryKey: ["retropick-api", "probability-history"] });
  }
}

/**
 * Subscribes to the backend `/ws` fanout (Postgres NOTIFY).
 * Probability history is invalidated immediately; other `retropick-api` queries are debounced.
 * Scoped pages ignore NOTIFY payloads that only mention other template IDs when `templateIds` is present.
 */
export function useIndexerWebSocket(enabled = true, scopeTemplateId?: string) {
  const qc = useQueryClient();
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scope = normalizeWsTemplateId(scopeTemplateId);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let ws: WebSocket | null = null;
    let closed = false;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSeq = Number(window.localStorage.getItem("retropick:last-ws-seq") ?? "0") || 0;

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
          void qc.invalidateQueries({ queryKey: ["retropick-api"] });
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
        const channels = scope ? ["global:markets", `market:${scope}`] : ["global:markets"];
        ws?.send(JSON.stringify({ type: "subscribe", channels, lastSeq }));
      };

      ws.onmessage = (ev) => {
        retryAttempt = 0;
        const raw = String(ev.data);
        const realtimeEvent = parseRealtimeEvent(raw);
        if (realtimeEvent?.seq != null) {
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
        if (realtimeEvent && patchMarketCaches(qc, realtimeEvent)) {
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
        if (!closed) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
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
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [enabled, qc, scope]);
}
