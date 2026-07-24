"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { baseSepolia } from "viem/chains";

import { publicClient } from "@/lib/chain";
import {
  apiBase,
  fetchGlobalState,
  fetchHealth,
  fetchTxPrepareMeta,
} from "@/lib/api";
import { indexerLagBlocks, lagBand } from "@/lib/opsPreflight";
import { cn } from "@/lib/utils";

type PreflightBundle = {
  health: Awaited<ReturnType<typeof fetchHealth>>;
  gs: Awaited<ReturnType<typeof fetchGlobalState>>;
  meta: Awaited<ReturnType<typeof fetchTxPrepareMeta>> | null;
  chainHead: bigint | null;
};

async function loadPreflight(): Promise<PreflightBundle> {
  const [health, gs, chainHead] = await Promise.all([
    fetchHealth(),
    fetchGlobalState(),
    publicClient.getBlockNumber().catch(() => null),
  ]);
  let meta: PreflightBundle["meta"] = null;
  try {
    meta = await fetchTxPrepareMeta();
  } catch {
    meta = null;
  }
  return { health, gs, meta, chainHead };
}

function statusDot(ok: boolean, warn: boolean) {
  if (ok) return "bg-emerald-500";
  if (warn) return "bg-amber-400";
  return "bg-rose-500";
}

export function OpsDeployPreflight() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["ops-deploy-preflight"],
    queryFn: loadPreflight,
    staleTime: 15_000,
  });

  const data = q.data;
  const chainMismatch =
    data != null && data.gs.environment.chainId !== baseSepolia.id;
  const lag =
    data?.chainHead != null
      ? indexerLagBlocks(data.chainHead, data.gs.indexer.lastIndexedBlock)
      : null;
  const lagClass =
    lag == null ? "text-[color:var(--color-placeholderText)]" : lagBand(lag) === "ok"
      ? "text-emerald-400"
      : lagBand(lag) === "warn"
        ? "text-amber-300"
        : "text-rose-300";

  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--color-mainBorder)] bg-[color:var(--color-secondaryBg)] p-4 text-sm",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium text-[color:var(--color-primaryText)]">Deploy & prepare preflight</h2>
          <p className="mt-1 text-xs text-[color:var(--color-placeholderText)]">
            Live checks before calldata or launch steps. API:{" "}
            <code className="rounded bg-[color:var(--color-inputBg)] px-1 font-mono text-[11px]">{apiBase}</code>
          </p>
        </div>
        <button
          type="button"
          disabled={q.isFetching}
          onClick={() => void qc.invalidateQueries({ queryKey: ["ops-deploy-preflight"] })}
          className="rounded-lg border border-[color:var(--color-mainBorder)] bg-[color:var(--color-inputBg)] px-3 py-1.5 text-xs text-[color:var(--color-primaryText)] hover:bg-[color:var(--color-inputBgHover)] disabled:opacity-50"
        >
          {q.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {q.isError ? (
        <p className="mt-3 text-sm text-rose-300">
          {q.error instanceof Error ? q.error.message : "Preflight failed"}
        </p>
      ) : null}

      {data ? (
        <ul className="mt-3 space-y-2 text-[color:var(--color-secondaryText)]">
          <li className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                statusDot(Boolean(data.health.ok), false),
              )}
            />
            <span>
              <span className="font-medium text-[color:var(--color-primaryText)]">API health</span> —{" "}
              {data.health.ok ? "ok" : "not ok"}; last indexed block{" "}
              <code className="font-mono text-xs">{data.health.lastIndexedBlock}</code>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                statusDot(!chainMismatch, chainMismatch),
              )}
            />
            <span>
              <span className="font-medium text-[color:var(--color-primaryText)]">Environment</span> —{" "}
              {data.gs.environment.name} · chainId{" "}
              <code className="font-mono text-xs">{data.gs.environment.chainId}</code>
              {chainMismatch ? (
                <span className="text-rose-300"> (expected Base Sepolia {baseSepolia.id})</span>
              ) : null}
              <br />
              <span className="text-xs text-[color:var(--color-placeholderText)]">
                MarketEngine proxy{" "}
                <code className="font-mono text-[11px]">{data.gs.contracts.marketEngineProxy}</code>
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                lag == null ? "bg-zinc-500" : statusDot(lagBand(lag) === "ok", lagBand(lag) === "warn"),
              )}
            />
            <span>
              <span className="font-medium text-[color:var(--color-primaryText)]">Indexer vs RPC head</span>
              {data.chainHead == null ? (
                <span className="text-[color:var(--color-placeholderText)]"> — RPC head unavailable in browser</span>
              ) : (
                <>
                  {" "}
                  — lag{" "}
                  <span className={cn("font-mono text-xs", lagClass)}>
                    {lag?.toString() ?? "—"} blocks
                  </span>{" "}
                  <span className="text-xs text-[color:var(--color-placeholderText)]">
                    (head {data.chainHead.toString()})
                  </span>
                </>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1.5 inline-block size-2 shrink-0 rounded-full",
                statusDot(data.meta != null && data.meta.functions.length > 0, data.meta == null),
              )}
            />
            <span>
              <span className="font-medium text-[color:var(--color-primaryText)]">Prepare whitelist</span> —{" "}
              {data.meta ? (
                <>
                  <code className="font-mono text-xs">{data.meta.functions.length}</code> functions in{" "}
                  <code className="font-mono text-[11px]">/ops/tx/prepare/meta</code>
                </>
              ) : (
                <span className="text-amber-200">metadata unavailable (prepare may still work)</span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-sky-500" />
            <span className="text-xs">
              <span className="font-medium text-[color:var(--color-primaryText)]">Counts</span> — templates{" "}
              <code className="font-mono">{data.gs.counts.templates}</code>, rolling halted{" "}
              <code className="font-mono">{data.gs.counts.rollingHalted}</code>, open incidents{" "}
              <code className="font-mono">{data.gs.counts.openIncidents}</code>
            </span>
          </li>
        </ul>
      ) : q.isLoading ? (
        <p className="mt-3 text-xs text-[color:var(--color-placeholderText)]">Loading preflight…</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[color:var(--color-mainBorder)] pt-3 text-xs">
        <Link
          href="/monitor"
          className="rounded border border-[color:var(--color-mainBorder)] px-2 py-1 text-[color:var(--color-primaryText)] hover:bg-[color:var(--color-inputBgHover)]"
        >
          Monitor
        </Link>
        <Link
          href="/launch"
          className="rounded border border-[color:var(--color-mainBorder)] px-2 py-1 text-[color:var(--color-primaryText)] hover:bg-[color:var(--color-inputBgHover)]"
        >
          Lifecycle
        </Link>
        <Link
          href="/prepare"
          className="rounded border border-[color:var(--color-mainBorder)] px-2 py-1 text-[color:var(--color-primaryText)] hover:bg-[color:var(--color-inputBgHover)]"
        >
          Transactions
        </Link>
      </div>
    </section>
  );
}
