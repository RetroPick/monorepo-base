import { useEffect, useRef } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { getApiWebSocketUrl } from "@/lib/api/retropickApi";

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

    const scheduleInvalidate = (templateId?: string) => {
      invalidateProbabilityHistoryNow(qc, templateId);

      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(() => {
        const t = normalizeWsTemplateId(templateId);
        if (t) {
          void qc.invalidateQueries({ queryKey: ["retropick-api", "market", t] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "epochs", t] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "markets"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "user-positions"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "user-claims"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "user-events"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "portfolio-summary"] });
          void qc.invalidateQueries({ queryKey: ["retropick-api", "user-watchlist"] });
        } else {
          void qc.invalidateQueries({ queryKey: ["retropick-api"] });
        }
      }, WS_STALE_MS);
    };

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(getApiWebSocketUrl());
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        retryAttempt = 0;
      };

      ws.onmessage = (ev) => {
        retryAttempt = 0;
        const raw = String(ev.data);
        const ids = parseNotifyTemplateIds(raw);

        if (scope) {
          if (ids.length === 0) {
            scheduleInvalidate(scope);
            return;
          }
          if (!ids.some((id) => id === scope)) return;
          scheduleInvalidate(scope);
          return;
        }

        scheduleInvalidate(undefined);
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
