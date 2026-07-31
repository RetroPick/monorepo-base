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

export function useMarketsRealtime({
  marketId,
  tokenId,
  enabled,
  realtimeCapability,
}: UseMarketsRealtimeOptions): UseMarketsRealtimeResult {
  const [state, setState] = useState<RealtimeConnectionState>("idle");
  const [snapshot, setSnapshot] = useState<OrderBookSnapshot | null>(null);
  const clientRef = useRef<ReturnType<typeof createMarketsRealtimeClient> | null>(null);

  useEffect(() => {
    if (!enabled || !realtimeCapability || !marketId || !tokenId) {
      setState("polling_fallback");
      return undefined;
    }
    const client = createMarketsRealtimeClient({ baseUrl: getApiBaseUrl() });
    clientRef.current = client;
    const offState = client.onState(setState);
    const offMsg = client.onMessage((envelope: RealtimeEnvelope) => {
      if (envelope.eventType === "orderbook.snapshot" || envelope.eventType === "orderbook.delta") {
        setSnapshot(envelope.payload as OrderBookSnapshot);
      }
    });
    client.connect(marketId, tokenId);
    const onVisibility = () => {
      client.setBackgrounded(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      offState();
      offMsg();
      client.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, marketId, realtimeCapability, tokenId]);

  const pollingOnly = state !== "live";
  const label =
    state === "live"
      ? "Live"
      : state === "connecting"
        ? "Reconnecting"
        : state === "resyncing"
          ? "Resynchronizing"
          : state === "polling_fallback"
            ? "Realtime unavailable"
            : "Snapshot polling — not realtime";

  return { state, snapshot, label, pollingOnly };
}
