import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getApiWebSocketUrl } from "@/lib/api/retropickApi";

const WS_STALE_MS = 12_000;

function normalizeWsTemplateId(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

/**
 * Subscribes to the backend `/ws` fanout (Postgres NOTIFY).
 * When the payload is JSON with a `templateId` field, narrows invalidation to that market;
 * otherwise invalidates all `retropick-api` queries.
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
        let narrow: string | undefined;
        try {
          const p = JSON.parse(String(ev.data)) as { templateId?: string };
          if (typeof p.templateId === "string") narrow = p.templateId;
        } catch {
          /* opaque payload */
        }
        if (scope && narrow && normalizeWsTemplateId(narrow) !== scope) return;
        scheduleInvalidate(narrow ?? scope);
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
