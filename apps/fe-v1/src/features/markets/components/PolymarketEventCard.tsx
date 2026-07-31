import { Link } from "react-router-dom";
import type { EventSummary, MarketFreshness } from "@retropick/polymarket";

import { FreshnessBadge } from "@/features/markets/components/FreshnessBadge";
import { cn } from "@/lib/utils";

type PolymarketEventCardProps = {
  event: EventSummary;
  freshness?: MarketFreshness;
  className?: string;
};

export function PolymarketEventCard({ event, freshness, className }: PolymarketEventCardProps) {
  const eventHref = `/app/events/${encodeURIComponent(event.id)}`;
  const marketLabel = `${event.marketCount} market${event.marketCount === 1 ? "" : "s"}`;

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition hover:border-primary/30 hover:shadow-md",
        className,
      )}
    >
      <Link
        to={eventHref}
        className="flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label={`View event: ${event.title}`}
      >
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {event.status}
            </span>
            {freshness ? <FreshnessBadge freshness={freshness} marketStatus={event.status} /> : null}
          </div>

          <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">{event.title}</h2>

          <p className="mt-auto text-sm text-muted-foreground">{marketLabel}</p>

          <p className="text-xs text-muted-foreground">Read-only · trading unavailable</p>
        </div>
      </Link>
    </article>
  );
}
