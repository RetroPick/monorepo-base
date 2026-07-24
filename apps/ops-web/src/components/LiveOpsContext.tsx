"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { fetchLiveGlobal, type LiveEnvelope, type LiveGlobalData } from "@/lib/api";

type LiveCtx = {
  liveGlobal: LiveEnvelope<LiveGlobalData> | null;
  liveError: string | null;
  loadingLive: boolean;
  refreshLiveGlobal: () => Promise<void>;
};

const Ctx = createContext<LiveCtx | null>(null);

export function LiveOpsProvider({ children }: { children: React.ReactNode }) {
  const [liveGlobal, setLiveGlobal] = useState<LiveEnvelope<LiveGlobalData> | null>(
    null,
  );
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);

  const refreshLiveGlobal = useCallback(async () => {
    setLoadingLive(true);
    setLiveError(null);
    try {
      const g = await fetchLiveGlobal();
      setLiveGlobal(g);
    } catch (e) {
      setLiveError(e instanceof Error ? e.message : "live fetch failed");
      setLiveGlobal(null);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  const v = useMemo(
    () => ({
      liveGlobal,
      liveError,
      loadingLive,
      refreshLiveGlobal,
    }),
    [liveGlobal, liveError, loadingLive, refreshLiveGlobal],
  );

  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useLiveOps() {
  const x = useContext(Ctx);
  if (!x) {
    throw new Error("useLiveOps outside LiveOpsProvider");
  }
  return x;
}
