import { useId, useMemo, useState } from "react";

import { ChartLabelWatermark } from "@/components/market/ChartLabelWatermark";
import type { ClaimRow, PortfolioSummaryPositionRow } from "@/lib/api/retropickApi";
import { formatSignedStakeUsd, parseSignedIntString, parseStakeRaw } from "@/features/portfolio/formatStakeUsd";
import { cn } from "@/lib/utils";

import type { NetWorthTimeframe } from "./NetWorthCard";

function windowStartMs(tf: NetWorthTimeframe): number | null {
  if (tf === "all") return null;
  const days = tf === "7d" ? 7 : 30;
  return Date.now() - days * 86_400_000;
}

export type PortfolioPnLSplitSectionProps = {
  timeframe: NetWorthTimeframe;
  claims: ClaimRow[];
  summaryPositions: PortfolioSummaryPositionRow[];
  /** Formatted headline (e.g. from overview). */
  unrealizedHeadline: string;
};

type Point = { x: number; y: number };

type PnlTab = "realized" | "unrealized";

function buildRealizedSeries(claims: ClaimRow[], tf: NetWorthTimeframe): Point[] {
  const start = windowStartMs(tf);
  const dated = claims.filter((c) => {
    const t = c.indexedAt ? Date.parse(c.indexedAt) : NaN;
    if (!Number.isFinite(t)) return false;
    if (start != null && t < start) return false;
    return true;
  });
  const sorted = [...dated].sort((a, b) => Date.parse(a.indexedAt!) - Date.parse(b.indexedAt!));

  if (sorted.length === 0) {
    return [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
  }

  const cums: bigint[] = [];
  let run = 0n;
  for (const c of sorted) {
    run += parseStakeRaw(c.eventPayload?.amount) ?? 0n;
    cums.push(run);
  }
  const maxY = run > 0n ? run : 1n;

  const pts: Point[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const x = sorted.length <= 1 ? 100 : (i / (sorted.length - 1)) * 100;
    const yNum = Number((cums[i]! * 100n) / maxY);
    pts.push({ x, y: Math.min(100, Math.max(0, yNum)) });
  }
  if (pts[0].x > 0) pts.unshift({ x: 0, y: 0 });
  const last = pts[pts.length - 1]!;
  if (last.x < 100) pts.push({ x: 100, y: last.y });
  return pts;
}

type BarRow = { label: string; wei: bigint };

function buildUnrealizedBars(positions: PortfolioSummaryPositionRow[]): BarRow[] {
  const out: BarRow[] = [];
  for (const p of positions) {
    if (p.error || !p.templateId || p.unrealizedPnlWei === undefined) continue;
    const w = parseSignedIntString(p.unrealizedPnlWei);
    if (w === undefined || w === 0n) continue;
    const short = `${p.templateId.slice(0, 8)}…·e${p.epochId ?? "?"}`;
    out.push({ label: short, wei: w });
  }
  out.sort((a, b) => {
    const da = a.wei >= 0n ? a.wei : -a.wei;
    const db = b.wei >= 0n ? b.wei : -b.wei;
    if (da === db) return 0;
    return da < db ? 1 : -1;
  });
  return out.slice(0, 10);
}

function hasIndexedClaimInWindow(claims: ClaimRow[], tf: NetWorthTimeframe): boolean {
  const start = windowStartMs(tf);
  return claims.some((c) => {
    const t = c.indexedAt ? Date.parse(c.indexedAt) : NaN;
    if (!Number.isFinite(t)) return false;
    if (start != null && t < start) return false;
    return true;
  });
}

export function PortfolioPnLSplitSection({
  timeframe,
  claims,
  summaryPositions,
  unrealizedHeadline,
}: PortfolioPnLSplitSectionProps) {
  const [tab, setTab] = useState<PnlTab>("realized");
  const fillGradId = `rp-realized-${useId().replace(/:/g, "")}`;
  const hasClaimsInWindow = useMemo(() => hasIndexedClaimInWindow(claims, timeframe), [claims, timeframe]);
  const realizedPts = useMemo(() => {
    if (!hasClaimsInWindow) return [] as Point[];
    return buildRealizedSeries(claims, timeframe);
  }, [claims, timeframe, hasClaimsInWindow]);
  const realizedPath = useMemo(() => {
    if (realizedPts.length < 2) return "";
    return realizedPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${(100 - p.y).toFixed(2)}`).join(" ");
  }, [realizedPts]);

  const bars = useMemo(() => buildUnrealizedBars(summaryPositions), [summaryPositions]);
  const maxBar = useMemo(() => {
    let m = 1n;
    for (const b of bars) {
      const a = b.wei >= 0n ? b.wei : -b.wei;
      if (a > m) m = a;
    }
    return m;
  }, [bars]);

  const tabBtn = (id: PnlTab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        "min-w-0 flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors",
        tab === id
          ? "bg-background text-foreground shadow-sm dark:bg-white/[0.08]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex w-full shrink-0 flex-col gap-1.5">
      <div
        className="flex shrink-0 gap-0.5 rounded-md bg-muted/25 p-0.5 dark:bg-white/[0.05]"
        role="tablist"
        aria-label="PnL view"
      >
        {tabBtn("realized", "Realized")}
        {tabBtn("unrealized", "Open PnL")}
      </div>

      {tab === "realized" ? (
        <div className="flex flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 px-0.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Claim payouts</h3>
            <span className="text-[10px] text-muted-foreground">
              {timeframe === "all" ? "All" : timeframe === "7d" ? "7d" : "30d"}
            </span>
          </div>
          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-muted/15 dark:bg-white/[0.04] sm:h-48">
            <svg
              viewBox="0 0 100 100"
              className="relative z-0 h-full w-full"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id={fillGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(5 150 105)" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {realizedPath ? (
                <>
                  <path
                    d={`${realizedPath} L 100 100 L 0 100 Z`}
                    fill={`url(#${fillGradId})`}
                    className="stroke-none"
                  />
                  <path
                    d={realizedPath}
                    fill="none"
                    className="stroke-[1.25] stroke-emerald-500 dark:stroke-emerald-400"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}
            </svg>
            <ChartLabelWatermark
              variant="portfolio"
              className="pointer-events-none absolute right-2 top-2 z-20 !h-10 !max-w-[10rem] opacity-[0.55] sm:right-3 sm:top-2.5 sm:!h-11 sm:!max-w-[11rem] sm:opacity-60"
            />
            {!hasClaimsInWindow ? (
              <p className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-background/80 px-8 text-center text-[10px] leading-snug text-muted-foreground dark:bg-background/60 sm:px-10 sm:text-[11px]">
                {claims.length === 0
                  ? "No claim payouts indexed yet. Flat until claims appear."
                  : "No claims in this window. Try All or 30d."}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex max-h-[24rem] flex-col gap-1 overflow-y-auto sm:max-h-[28rem]">
          <div className="relative min-h-[10rem] flex-1 overflow-hidden rounded-lg bg-muted/15 px-2.5 pb-2 pt-7 dark:bg-white/[0.04] sm:min-h-[11rem] sm:pt-8">
            <div className="relative z-[1] flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-[5.5rem]">
              <h3 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Open positions</h3>
              <span className="text-[10px] text-muted-foreground">Per market</span>
            </div>
            <p className="relative z-[1] mt-1 text-sm font-bold tabular-nums tracking-tight text-foreground sm:text-base">
              {unrealizedHeadline}
            </p>
            <div className="relative z-[1] mt-1.5 min-h-0 space-y-1">
            {bars.length === 0 ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Nothing to show yet. Open PnL appears when live stake differs from what you put in (after deposits and
                side switches).
              </p>
            ) : (
              bars.map((b) => {
                const pct = maxBar > 0n ? Number((b.wei >= 0n ? b.wei : -b.wei) * 100n / maxBar) : 0;
                const pos = b.wei >= 0n;
                return (
                  <div key={b.label} className="space-y-0.5">
                    <div className="flex justify-between gap-2 text-[9px] text-muted-foreground">
                      <span className="truncate font-mono">{b.label}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          pos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {formatSignedStakeUsd(b.wei)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/50 dark:bg-white/[0.06]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pos ? "bg-emerald-500/80 dark:bg-emerald-400/80" : "bg-rose-500/80 dark:bg-rose-400/80",
                        )}
                        style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            </div>
            <ChartLabelWatermark
              variant="portfolio"
              className="pointer-events-none absolute right-2 top-2 z-20 !h-10 !max-w-[10rem] opacity-[0.55] sm:right-3 sm:top-2.5 sm:!h-11 sm:!max-w-[11rem] sm:opacity-60"
            />
          </div>
        </div>
      )}
    </div>
  );
}
