import type { ReactNode } from "react";
import { Calendar } from "lucide-react";

import { ChartLabelWatermark } from "@/shared/components/ChartLabelWatermark";
import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/shared/lib/ui/discover-chip-styles";
import { cn } from "@/shared/lib/utils";

import { GUEST_NET_WORTH_SERIES } from "../../fixtures/portfolioGuest";

export type NetWorthTimeframe = "all" | "30d" | "7d";

export type NetWorthCardProps = {
  netWorthLabel: string;
  timeframe: NetWorthTimeframe;
  onTimeframeChange: (t: NetWorthTimeframe) => void;
  title?: string;
  chartSlot?: ReactNode;
  compactChart?: boolean;
  surface?: "card" | "plain";
};

const TIMES: { id: NetWorthTimeframe; label: string }[] = [
  { id: "all", label: "All" },
  { id: "30d", label: "30d" },
  { id: "7d", label: "7d" },
];

function NetWorthSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null;
  const w = 100;
  const h = 24;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 2 - ((v - min) / range) * (h - 4)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="networth-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--accent-cyan))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--accent-cyan))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="networth-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(var(--accent-cyan))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#networth-area)" />
      <path d={line} fill="none" stroke="url(#networth-line)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2" fill="hsl(var(--accent-cyan))" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function NetWorthCard({
  netWorthLabel,
  timeframe,
  onTimeframeChange,
  title = "Exposure and claims",
  chartSlot,
  compactChart = false,
  surface = "card",
}: NetWorthCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col",
        surface === "card"
          ? cn(compactChart ? "p-4" : "p-5", "rounded-2xl border border-border/60 bg-card shadow-sm dark:border-white/[0.08]")
          : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">{netWorthLabel}</p>
          <Calendar className="size-4 shrink-0 text-muted-foreground opacity-70" aria-hidden />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Chart time range">
        {TIMES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTimeframeChange(id)}
            className={cn(discoverChipPill(), timeframe === id ? discoverChipActive : discoverChipIdle)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "relative mt-2 flex flex-1 flex-col rounded-xl border border-dashed border-border/50 bg-muted/10 dark:border-white/[0.08]",
          compactChart ? "min-h-[6.5rem] sm:min-h-[7.25rem]" : "min-h-[10rem]",
        )}
      >
        {chartSlot ? (
          <div className="relative z-[1] min-h-0 flex-1 px-2 pb-1 pt-2">{chartSlot}</div>
        ) : (
          <div className="absolute inset-x-3 bottom-2 top-2">
            <NetWorthSparkline data={GUEST_NET_WORTH_SERIES} />
          </div>
        )}
        <ChartLabelWatermark variant="portfolio" className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3" />
      </div>
    </div>
  );
}
