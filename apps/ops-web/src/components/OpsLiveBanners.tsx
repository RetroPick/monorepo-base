"use client";

import { useLiveOps } from "./LiveOpsContext";

/** Critical protocol banners from last successful live global refresh only. */
export function OpsLiveBanners() {
  const { liveGlobal } = useLiveOps();
  const d = liveGlobal?.data;
  if (!d) return null;

  const items: { show: boolean; className: string; text: string }[] = [
    {
      show: d.globalPaused,
      className: "bg-rose-950/50 text-rose-100",
      text: "Live RPC: globalPaused is true.",
    },
    {
      show: d.yieldRouterDisabled,
      className: "bg-orange-950/50 text-orange-100",
      text: "Live RPC: yieldRouterDisabled is true.",
    },
    {
      show: BigInt(d.totalUnreconciledRecovered || "0") > BigInt(0),
      className: "bg-amber-950/50 text-amber-100",
      text: `Live RPC: totalUnreconciledRecovered is non-zero (${d.totalUnreconciledRecovered}).`,
    },
  ];

  const any = items.some((i) => i.show);
  if (!any) return null;

  return (
    <div className="space-y-1 border-b border-zinc-800">
      {items
        .filter((i) => i.show)
        .map((i) => (
          <div key={i.text} className={`px-4 py-2 text-sm ${i.className}`}>
            {i.text}
          </div>
        ))}
      <div className="bg-zinc-900/40 px-4 py-1 text-center text-xs text-zinc-500">
        Live RPC snapshot at block {liveGlobal.blockNumber} — verify before acting.
      </div>
    </div>
  );
}
