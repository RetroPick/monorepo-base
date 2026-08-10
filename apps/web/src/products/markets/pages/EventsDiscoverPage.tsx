import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import {
  DISCOVERY_VERTICALS,
  NON_CRYPTO_VERTICALS,
  type DiscoveryVerticalId,
  type MarketDiscoveryVerticalId,
} from "@/shared/lib/discovery-verticals";

import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { DiscoverMarketTypesStrip } from "../components/discover/DiscoverMarketTypesStrip";
import { EventCard } from "../components/EventCard";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsShellLayout } from "../components/MarketsShellLayout";
import { useMarketsCapabilities, useMarketsEventsInfinite } from "../hooks/useMarketsQueries";
import { isDegradedFreshness } from "../lib/freshness";
import { isSameQueryErrorKind } from "../lib/errors";

export function EventsDiscoverPage() {
  const [activeVertical, setActiveVertical] = useState<DiscoveryVerticalId>("trending");
  const capabilities = useMarketsCapabilities();
  const events = useMarketsEventsInfinite();

  const allEvents = events.data?.pages.flatMap((p) => p.events) ?? [];
  const listFreshness = events.data?.pages[0]?.freshness;
  const showCategoryEmpty = NON_CRYPTO_VERTICALS.has(activeVertical as MarketDiscoveryVerticalId);
  const trendingMarketGridClass =
    "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-4 xl:gap-5";

  return (
    <MarketsShellLayout
      discoveryNav={{
        verticals: DISCOVERY_VERTICALS,
        activeVerticalId: activeVertical,
        onVerticalChange: setActiveVertical,
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="mt-1 text-sm text-muted-foreground">Polymarket events via RetroPick · read-only catalog</p>
        </div>
        {listFreshness ? <FreshnessBadge freshness={listFreshness} /> : null}
      </div>

      {listFreshness && isDegradedFreshness(listFreshness) ? <StaleBanner /> : null}

      {capabilities.error && events.error && isSameQueryErrorKind(capabilities.error, events.error) ? (
        <DataStateBanner
          error={capabilities.error}
          onRetry={() => {
            void capabilities.refetch();
            void events.refetch();
          }}
        />
      ) : (
        <>
          <DataStateBanner error={capabilities.error} onRetry={() => capabilities.refetch()} />
          <DataStateBanner error={events.error} onRetry={() => events.refetch()} />
        </>
      )}

      {events.isLoading ? <p className="text-sm text-muted-foreground">Loading Polymarket catalog…</p> : null}

      {!events.isLoading && showCategoryEmpty ? (
        <section className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-foreground">No markets in this category yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Category tags are not exposed on the catalog API yet. Use Trending to browse all Polymarket events.
          </p>
        </section>
      ) : null}

      {!events.isLoading && !showCategoryEmpty && activeVertical === "trending" ? (
        <div className="flex flex-col gap-8" data-testid="discover-layout-trending">
          <DiscoverMarketTypesStrip />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">All events</h2>
            {allEvents.length === 0 && !events.error ? (
              <DataStateEmpty
                title="No events currently available"
                description="The catalog is temporarily empty. Try again in a moment."
              />
            ) : (
              <div className={cn("mt-4", trendingMarketGridClass)} data-testid="discover-trending-market-grid">
                {allEvents.map((event) => (
                  <div key={event.id} className="min-h-0 w-full self-start">
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!events.isLoading && !showCategoryEmpty && activeVertical !== "trending" ? (
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight capitalize">{activeVertical.replace("_", " ")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Showing all events until category filters are available.</p>
          <div className={cn("mt-4", trendingMarketGridClass)}>
            {allEvents.map((event) => (
              <div key={event.id} className="min-h-0 w-full self-start">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

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

      {capabilities.data ? (
        <details className="mt-6 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">Catalog status</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded border border-border px-2 py-1">
              Catalog: {capabilities.data.catalog ? "available" : "unavailable"}
            </span>
            <span className="rounded border border-border px-2 py-1">Trading: unavailable</span>
            <span className="rounded border border-border px-2 py-1">
              Realtime: {capabilities.data.features?.realtime ? "on" : "off (polling only)"}
            </span>
          </div>
        </details>
      ) : null}
    </MarketsShellLayout>
  );
}

export default EventsDiscoverPage;
