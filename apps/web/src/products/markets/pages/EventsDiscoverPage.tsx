import { Link } from "react-router-dom";

import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { EventCard } from "../components/EventCard";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsReadLayout } from "../components/MarketsReadLayout";
import { useMarketsCapabilities, useMarketsEventsInfinite } from "../hooks/useMarketsQueries";
import { isDegradedFreshness } from "../lib/freshness";

export function EventsDiscoverPage() {
  const capabilities = useMarketsCapabilities();
  const events = useMarketsEventsInfinite();

  const allEvents = events.data?.pages.flatMap((p) => p.events) ?? [];
  const listFreshness = events.data?.pages[0]?.freshness;

  return (
    <MarketsReadLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Polymarket events via RetroPick · read-only · trading unavailable
          </p>
        </div>
        {listFreshness ? <FreshnessBadge freshness={listFreshness} /> : null}
      </div>

      {listFreshness && isDegradedFreshness(listFreshness) ? <StaleBanner /> : null}

      {capabilities.data ? (
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded border border-border px-2 py-1">
            Catalog: {capabilities.data.catalog ? "available" : "unavailable"}
          </span>
          <span className="rounded border border-border px-2 py-1">Trading: unavailable</span>
          <span className="rounded border border-border px-2 py-1">
            Realtime: {capabilities.data.features?.realtime ? "on" : "off (polling only)"}
          </span>
        </div>
      ) : null}

      <DataStateBanner error={capabilities.error} onRetry={() => capabilities.refetch()} />
      <DataStateBanner error={events.error} onRetry={() => events.refetch()} />

      {events.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading Polymarket catalog…</p>
      ) : null}

      {!events.isLoading && !events.error && allEvents.length === 0 ? (
        <DataStateEmpty
          title="No events currently available"
          description="The catalog is temporarily empty. Try again in a moment."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {allEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {events.hasNextPage ? (
        <button
          type="button"
          className="mt-8 w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted"
          disabled={events.isFetchingNextPage}
          onClick={() => events.fetchNextPage()}
        >
          {events.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </MarketsReadLayout>
  );
}

export default EventsDiscoverPage;
