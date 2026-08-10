import { Link } from "react-router-dom";

import { ChartLabelWatermark } from "@/shared/components/ChartLabelWatermark";
import { cn } from "@/shared/lib/utils";

import type { CategorySlice } from "../../fixtures/portfolioGuest";
import { PORTFOLIO_CATEGORY_LEGEND } from "../../fixtures/portfolioGuest";
import { portfolioPath } from "../../routes/paths";

export type CategoryDistributionCardProps = {
  slices: CategorySlice[];
  aboveFold?: boolean;
  showHistoryLink?: boolean;
  discoverFilterTitle?: string | null;
  surface?: "card" | "plain";
};

function segmentRing(cx: number, cy: number, rInner: number, rOuter: number, startAngle: number, endAngle: number): string {
  const x0o = cx + rOuter * Math.cos(startAngle);
  const y0o = cy + rOuter * Math.sin(startAngle);
  const x1o = cx + rOuter * Math.cos(endAngle);
  const y1o = cy + rOuter * Math.sin(endAngle);
  const x1i = cx + rInner * Math.cos(endAngle);
  const y1i = cy + rInner * Math.sin(endAngle);
  const x0i = cx + rInner * Math.cos(startAngle);
  const y0i = cy + rInner * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x0o} ${y0o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${large} 0 ${x0i} ${y0i} Z`;
}

export function CategoryDistributionCard({
  slices,
  aboveFold = false,
  showHistoryLink = false,
  discoverFilterTitle,
  surface = "card",
}: CategoryDistributionCardProps) {
  const total = slices.reduce((a, s) => a + Math.max(0, s.value), 0);
  const cx = 50;
  const cy = 50;
  const r = aboveFold ? 30 : 40;
  const innerR = aboveFold ? 18 : 24;

  let angle = -Math.PI / 2;
  const paths: { d: string; color: string; key: string }[] = [];
  if (total > 0) {
    for (const s of slices) {
      if (s.value <= 0) continue;
      const frac = s.value / total;
      const end = angle + frac * 2 * Math.PI;
      paths.push({ key: s.id, color: s.color, d: segmentRing(cx, cy, innerR, r, angle, end) });
      angle = end;
    }
  }

  const legendSlices = slices.length > 0 ? slices : PORTFOLIO_CATEGORY_LEGEND.map((x) => ({ ...x, value: 0 }));

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4",
        surface === "card"
          ? cn("rounded-2xl border border-border/60 bg-card p-4 shadow-sm dark:border-white/[0.08]", aboveFold && "gap-2 p-3")
          : "gap-2",
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground">Category Distribution</h2>
        {discoverFilterTitle ? (
          <p className="mt-0.5 text-[10px] font-medium text-primary sm:text-[11px]">Strip: {discoverFilterTitle}</p>
        ) : null}
      </div>
      <div className={cn("flex w-full flex-col items-center gap-2")}>
        <svg viewBox="0 0 100 100" className={cn(aboveFold ? "size-24" : "size-36", "shrink-0 overflow-visible")} aria-hidden>
          {paths.length > 0 ? (
            paths.map((p) => <path key={p.key} d={p.d} fill={p.color} stroke="hsl(var(--card))" strokeWidth={0.75} />)
          ) : (
            <circle cx={cx} cy={cy} r={r - 6} fill="hsl(var(--muted))" className="opacity-40" />
          )}
          <circle cx={cx} cy={cy} r={innerR - 1} fill="hsl(var(--card))" />
        </svg>
        <ul className={cn("w-full space-y-1", aboveFold && "space-y-1")}>
          {legendSlices.map((s) => (
            <li key={s.id} className={cn("flex items-center gap-2 font-medium text-foreground", aboveFold ? "text-[10px]" : "text-xs")}>
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="flex-1 truncate">{s.label}</span>
              <span className="shrink-0 text-muted-foreground/70">-</span>
            </li>
          ))}
        </ul>
      </div>
      {showHistoryLink ? (
        <Link
          to={`${portfolioPath()}?section=activity`}
          className="text-center text-xs font-semibold text-primary underline-offset-4 hover:underline sm:text-left"
        >
          View History log
        </Link>
      ) : null}
      <ChartLabelWatermark variant="portfolio" className="pointer-events-none absolute right-2 top-2 z-20 sm:right-3 sm:top-3" />
    </div>
  );
}
