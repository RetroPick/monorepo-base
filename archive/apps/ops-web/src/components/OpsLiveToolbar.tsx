"use client";

import { useLiveOps } from "./LiveOpsContext";

export function OpsLiveToolbar() {
  const { liveGlobal, liveError, loadingLive, refreshLiveGlobal } = useLiveOps();
  const d = liveGlobal?.data;

  return (
    <div className="border-b border-[color:var(--color-mainBorder)] bg-[color:var(--color-tabsBg)]">
      <div className="flex flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshLiveGlobal()}
            disabled={loadingLive}
            className="rounded-lg border border-[color:var(--color-containedButtonBg)] bg-[color:var(--color-containedButtonBg)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[color:var(--color-containedButtonBgHover)] disabled:opacity-50"
          >
            {loadingLive ? "Loading live…" : "Refresh live (RPC)"}
          </button>
          <span className="text-xs text-[color:var(--color-placeholderText)]">
            Backend{" "}
            <code className="font-mono text-[color:var(--color-secondaryText)]">
              /api/v1/ops/live/global
            </code>
          </span>
        </div>
        {liveError ? (
          <p className="text-xs text-amber-300">{liveError}</p>
        ) : d ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--color-secondaryText)]">
            <span>
              live block{" "}
              <span className="font-mono text-[color:var(--color-primaryText)]">{liveGlobal?.blockNumber}</span>
            </span>
            <span>
              paused{" "}
              <span className="font-mono text-[color:var(--color-primaryText)]">{String(d.globalPaused)}</span>
            </span>
            <span>
              yieldRouterDisabled{" "}
              <span className="font-mono text-[color:var(--color-primaryText)]">
                {String(d.yieldRouterDisabled)}
              </span>
            </span>
            <span>
              unreconciled{" "}
              <span className="font-mono text-[color:var(--color-primaryText)]">
                {d.totalUnreconciledRecovered}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
