import type { MarketFreshness } from "@retropick/polymarket";
import { clsx } from "clsx";

import { evaluateFreshnessUi, formatAgeMillis, freshnessLabel } from "../lib/freshness";

interface FreshnessBadgeProps {
  freshness?: MarketFreshness;
  marketStatus?: string;
  className?: string;
}

const tone: Record<string, string> = {
  fresh: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  delayed: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  stale: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  resyncing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  unavailable: "bg-destructive/15 text-destructive border-destructive/40",
  closed: "bg-muted text-muted-foreground border-border",
  resolved: "bg-muted text-muted-foreground border-border",
};

export function FreshnessBadge({ freshness, marketStatus, className }: FreshnessBadgeProps) {
  const state = evaluateFreshnessUi(freshness, marketStatus);
  const age = freshness?.ageMillis != null ? formatAgeMillis(freshness.ageMillis) : null;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone[state],
        className,
      )}
      role="status"
    >
      <span>{freshnessLabel(state)}</span>
      {age && state !== "unavailable" ? <span className="opacity-80">· {age}</span> : null}
    </span>
  );
}
