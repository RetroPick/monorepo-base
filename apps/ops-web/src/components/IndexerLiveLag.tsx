"use client";

import { useLiveOps } from "@/components/LiveOpsContext";

/**
 * Surfaces operator-critical lag between indexer head and last live RPC refresh.
 */
export function IndexerLiveLag({
  indexedBlock,
}: {
  indexedBlock: number | null | undefined;
}) {
  const { liveGlobal } = useLiveOps();
  const live = liveGlobal?.blockNumber;
  if (indexedBlock == null || live == null) return null;
  const lag = Number(live) - indexedBlock;
  const warn = lag > 20 || lag < 0;

  return (
    <div
      className={
        warn
          ? "border-b border-amber-900/40 bg-amber-950/30 px-4 py-2 text-xs text-amber-100"
          : "border-b border-[color:var(--color-mainBorder)] bg-[color:var(--color-secondaryBg)] px-4 py-1.5 text-xs text-[color:var(--color-placeholderText)]"
      }
    >
      <span className="font-medium text-[color:var(--color-primaryText)]">Head check:</span> indexer{" "}
      <span className="font-mono">{indexedBlock}</span> vs live RPC{" "}
      <span className="font-mono">{live}</span>
      {lag >= 0 ? (
        <>
          {" "}
          (Δ <span className="font-mono">{lag}</span> blocks)
        </>
      ) : (
        <span> — refresh live after indexer catches up</span>
      )}
      {warn ? (
        <span className="ml-2 text-amber-200/90">
          Large lag or RPC behind indexer — verify before acting.
        </span>
      ) : null}
    </div>
  );
}
