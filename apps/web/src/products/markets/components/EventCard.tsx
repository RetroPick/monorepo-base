import type { EventSummary } from "@retropick/polymarket";
import { Link } from "react-router-dom";
import { CalendarDays, Layers3 } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { eventPath } from "../routes/paths";
import { FreshnessBadge } from "./FreshnessBadge";

interface EventCardProps {
  event: EventSummary;
}

const CARD_SHELL = "flex min-h-[238px] flex-col";

function formatEndDate(endAt?: string | null) {
  if (!endAt) return "No end date";
  const d = new Date(endAt);
  if (Number.isNaN(d.getTime())) return "No end date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={eventPath(event.id)}
      className={cn(
        CARD_SHELL,
        "rounded-2xl border border-border/80 bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-elevated/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="line-clamp-3 font-display text-sm font-bold leading-snug text-foreground">{event.title}</h2>
        <FreshnessBadge freshness={event.freshness} marketStatus={event.status} />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1">
          <Layers3 className="size-3.5" aria-hidden />
          Catalog event
        </span>
        <span className="truncate">Canonical BFF</span>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
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
