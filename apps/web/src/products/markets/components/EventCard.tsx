import type { EventSummary } from "@retropick/polymarket";
import { Link } from "react-router-dom";

import { eventPath } from "../routes/paths";
import { FreshnessBadge } from "./FreshnessBadge";

interface EventCardProps {
  event: EventSummary;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={eventPath(event.id)}
      className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold leading-snug">{event.title}</h2>
        <FreshnessBadge freshness={event.freshness} marketStatus={event.status} />
      </div>
      <p className="text-xs text-muted-foreground">
        {event.marketCount} market{event.marketCount === 1 ? "" : "s"} · {event.id}
      </p>
    </Link>
  );
}
