import { useEffect, useRef, useState } from "react";
import {
  createMarketsRealtimeClient,
  type OrderBookSnapshot,
  type RealtimeConnectionState,
  type RealtimeEnvelope,
} from "@retropick/polymarket";

import { getApiBaseUrl } from "@/lib/runtimeEnv";

interface UseMarketsRealtimeOptions {
  marketId: string;
  tokenId: string;
  enabled: boolean;
  realtimeCapability: boolean;
}

interface UseMarketsRealtimeResult {
  state: RealtimeConnectionState;
  snapshot: OrderBookSnapshot | null;
  label: string;
  pollingOnly: boolean;
}

function hookLabel(state: RealtimeConnectionState): string {
  switch (state) {
    case "live":
      return "Live";
    case "connecting":
      return "Reconnecting";
    case "resyncing":
      return "Resynchronizing";
    case "polling_fallback":
      return "Realtime unavailable";
    default:
      return "Snapshot polling — not realtime";
  }
}

export function useMarketsRealtime({
  marketId,
  tokenId,
  enabled,
  realtimeCapability,
}: UseMarketsRealtimeOptions): UseMarketsRealtimeResult {
  const [state, setState] = useState<RealtimeConnectionState>("idle");
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot | null>(null);
  const clientRef = useRef<ReturnType<typeof createMarketsRealtimeClient> | null>(null);
  const liveRef = useRef(false);

  useEffect(() => {
    if (!enabled || !realtimeCapability || !marketId || !tokenId) {
      clientRef.current?.disconnect();
      clientRef.current = null;
      setSnapshot(null);
      setState("polling_fallback");
      return undefined;
    }

    const client = createMarketsRealtimeClient({ baseUrl: getApiBaseUrl() });
    clientRef.current = client;

    const offState = client.onState((next) => {
      liveRef.current = next === "live";
      setState(next);
      if (next !== "live") {
        setSnapshot(null);
      }
    });

    const offMsg = client.onMessage((envelope: RealtimeEnvelope) => {
      if (envelope.eventType === "orderbook.snapshot") {
        setSnapshot(envelope.payload as OrderBookSnapshot);
        return;
      }
      if (envelope.eventType === "orderbook.delta" && liveRef.current) {
        setSnapshot(envelope.payload as OrderBookSnapshot);
      }
    });

    client.connect(marketId, tokenId);

    const onVisibility = () => {
      const hidden = document.visibilityState === "hidden";
      client.setBackgrounded(hidden);
      if (!hidden) {
        client.resumeIfNeeded();
      }
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      offState();
      offMsg();
      client.disconnect();
      clientRef.current = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, marketId, realtimeCapability, tokenId]);

  const pollingOnly = !realtimeCapability || !enabled || state !== "live";
  const label = realtimeCapability && enabled ? hookLabel(state) : "Snapshot polling — not realtime";

  return { state, snapshot, label, pollingOnly };
}
