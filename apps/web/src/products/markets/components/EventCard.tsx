import type { EventSummary } from "@retropick/polymarket";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";

import { cn } from "@/shared/lib/utils";

import { eventPath } from "../routes/paths";
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

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={eventPath(event.id)}
      className={cn(
        CARD_SHELL,
        "rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition hover:border-primary/40 dark:border-white/[0.08]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="line-clamp-3 text-sm font-semibold leading-snug text-foreground">{event.title}</h2>
        <FreshnessBadge freshness={event.freshness} marketStatus={event.status} />
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {event.marketCount} market{event.marketCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden />
            {formatEndDate(event.endAt)}
          </p>
        </div>
        <div
          className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-muted/40 bg-muted/20"
          aria-hidden
        >
          <svg className="size-11 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="16" fill="none" strokeWidth="2.5" className="stroke-muted/40" />
            <circle
              cx="22"
              cy="22"
              r="16"
              fill="none"
              strokeWidth="2.5"
              stroke="rgb(59 130 246)"
              strokeLinecap="round"
              strokeDasharray="20 80"
            />
          </svg>
          <span className="absolute text-[10px] font-bold tabular-nums text-foreground">{event.marketCount}</span>
        </div>
      </div>
    </Link>
  );
}
