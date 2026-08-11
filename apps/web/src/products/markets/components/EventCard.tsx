import type { EventSummary } from "@retropick/polymarket";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { eventPath } from "../routes/paths";
import { MiniChart } from "./market/MiniChart";
import { FreshnessBadge } from "./FreshnessBadge";

interface EventCardProps {
  event: EventSummary;
}

const CARD_SHELL = "flex min-h-[200px] flex-col sm:h-[212px] sm:max-h-[212px]";

function formatEndDate(endAt?: string | null) {
  if (!endAt) return "No end date";
  const d = new Date(endAt);
  if (Number.isNaN(d.getTime())) return "No end date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Deterministic sparkline from event id — visual only, not price data. */
function sparklineFromId(id: string): number[] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return Array.from({ length: 12 }, (_, i) => 0.35 + ((hash >> (i % 16)) & 0xff) / 512);
}

export function EventCard({ event }: EventCardProps) {
  const sparkline = sparklineFromId(event.id);
  const trendUp = sparkline[sparkline.length - 1] >= sparkline[0];

  return (
    <Link
      to={eventPath(event.id)}
      className={cn(
        CARD_SHELL,
        "rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-elevated/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="line-clamp-3 font-display text-sm font-bold leading-snug text-foreground">{event.title}</h2>
        <FreshnessBadge freshness={event.freshness} marketStatus={event.status} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <MiniChart points={sparkline} positive={trendUp} width={72} height={28} />
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Activity</span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground">
            {event.marketCount} market{event.marketCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            {formatEndDate(event.endAt)}
          </p>
        </div>
        <div
          className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-elevated"
          aria-label={`${event.marketCount} markets`}
        >
          <span className="text-lg font-bold tabular-nums text-primary">{event.marketCount}</span>
          <span className="text-[8px] font-bold uppercase text-muted-foreground">Mkts</span>
        </div>
      </div>
    </Link>
  );
}
