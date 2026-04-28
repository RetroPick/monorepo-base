"use client";

import { useLiveOps } from "./LiveOpsContext";

export function OpsLiveToolbar() {
  const { liveGlobal, liveError, loadingLive, refreshLiveGlobal } = useLiveOps();
  const d = liveGlobal?.data;

  return (
    <div className="border-b border-zinc-800 bg-zinc-900/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshLiveGlobal()}
            disabled={loadingLive}
            className="rounded border border-sky-800 bg-sky-950/50 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-900/50 disabled:opacity-50"
          >
            {loadingLive ? "Loading live…" : "Refresh live (RPC)"}
          </button>
          <span className="text-xs text-zinc-500">
            Calls backend <code className="text-zinc-400">/api/v1/ops/live/global</code> — uses
            server RPC budget.
          </span>
        </div>
        {liveError ? (
          <p className="text-xs text-amber-300">{liveError}</p>
        ) : d ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <span>
              live block{" "}
              <span className="font-mono text-zinc-200">{liveGlobal?.blockNumber}</span>
            </span>
            <span>
              paused{" "}
              <span className="font-mono text-zinc-200">{String(d.globalPaused)}</span>
            </span>
            <span>
              yieldRouterDisabled{" "}
              <span className="font-mono text-zinc-200">
                {String(d.yieldRouterDisabled)}
              </span>
            </span>
            <span>
              unreconciled{" "}
              <span className="font-mono text-zinc-200">
                {d.totalUnreconciledRecovered}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
