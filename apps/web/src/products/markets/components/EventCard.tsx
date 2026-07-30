import { Link } from "react-router-dom";
import type { EventSummary } from "@retropick/polymarket";

import { formatProbability } from "../lib/decimal";
import { FreshnessBadge } from "./FreshnessBadge";

interface EventCardProps {
  event: EventSummary;
}

export function EventCard({ event }: EventCardProps) {
  const topPrice = event.marketCount > 0 ? null : null;
  return (
    <Link
      to={`/markets/events/${encodeURIComponent(event.id)}`}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>
        <FreshnessBadge freshness={event.freshness} marketStatus={event.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5 capitalize">{event.status}</span>
        <span>{event.marketCount} market{event.marketCount === 1 ? "" : "s"}</span>
        {event.slug ? <span className="font-mono truncate">{event.slug}</span> : null}
      </div>
      {topPrice ? (
        <p className="mt-2 text-sm text-muted-foreground">From {formatProbability(topPrice)}</p>
      ) : null}
    </Link>
  );
}
