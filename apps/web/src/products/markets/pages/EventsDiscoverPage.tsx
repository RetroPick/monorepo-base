import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, TrendingUp } from "lucide-react";

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
import { EventCardSkeleton } from "../components/EventCardSkeleton";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { useMarketsCapabilities, useMarketsEventsInfinite } from "../hooks/useMarketsQueries";
import { isDegradedFreshness } from "../lib/freshness";
import { isSameQueryErrorKind } from "../lib/errors";

const GRID_CLASS =
  "grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4";

function greetingForHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function EventsDiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "markets" ? "markets" : "explore";
  const [activeVertical, setActiveVertical] = useState<DiscoveryVerticalId>("trending");

  const capabilities = useMarketsCapabilities();
  const events = useMarketsEventsInfinite();

  const allEvents = events.data?.pages.flatMap((p) => p.events) ?? [];
  const listFreshness = events.data?.pages[0]?.freshness;
  const showCategoryEmpty = NON_CRYPTO_VERTICALS.has(activeVertical as MarketDiscoveryVerticalId);

  const setTab = (next: "explore" | "markets") => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <MarketsAppShell
      title={tab === "explore" ? "Explore" : "Markets"}
      onCategorySelect={(id) => {
        setActiveVertical(id);
        setTab("markets");
      }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          {tab === "explore" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{greetingForHour()}</p>
              <h1 className="font-display text-2xl font-bold tracking-tight">Discover markets</h1>
            </>
          ) : (
            <h1 className="font-display text-2xl font-bold tracking-tight">Markets</h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">Polymarket events via RetroPick BFF</p>
        </div>
        {listFreshness ? <FreshnessBadge freshness={listFreshness} /> : null}
      </div>

      <div className="mb-6 flex gap-2" role="tablist" aria-label="Discover sections">
        {(["explore", "markets"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors",
              tab === t ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        ))}
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

      {tab === "explore" && !events.isLoading ? (
        <section className="mb-8 rounded-xl border border-border bg-card p-5 animate-fade-up">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden />
            <h2 className="font-display text-sm font-bold">Trending now</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore active Polymarket events. Connect your wallet to trade when capabilities allow.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DISCOVERY_VERTICALS.slice(0, 5).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setActiveVertical(v.id);
                  setTab("markets");
                }}
                className="rounded-md border border-border bg-elevated px-3 py-1.5 text-xs font-semibold hover:border-primary/40"
              >
                {v.title}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {events.isLoading ? (
        <div className={cn(GRID_CLASS)} data-testid="discover-skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {!events.isLoading && tab === "markets" && showCategoryEmpty ? (
        <section className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold">No markets in this category yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use Trending to browse all Polymarket events.</p>
        </section>
      ) : null}

      {!events.isLoading && !showCategoryEmpty ? (
        <div className="flex flex-col gap-6" data-testid="discover-layout-trending">
          {tab === "markets" ? <DiscoverMarketTypesStrip /> : null}
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              {tab === "explore" ? (
                <>
                  <TrendingUp className="h-5 w-5 text-primary" aria-hidden />
                  Featured events
                </>
              ) : activeVertical === "trending" ? (
                "All events"
              ) : (
                <span className="capitalize">{activeVertical.replace("_", " ")}</span>
              )}
            </h2>
            {allEvents.length === 0 && !events.error ? (
              <DataStateEmpty
                title="No events currently available"
                description="The catalog is temporarily empty. Try again in a moment."
              />
            ) : (
              <div className={cn("mt-4", GRID_CLASS)} data-testid="discover-trending-market-grid">
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

      {events.hasNextPage ? (
        <button
          type="button"
          className="mt-8 w-full rounded-lg border border-border py-2.5 text-sm font-bold hover:bg-elevated"
          disabled={events.isFetchingNextPage}
          onClick={() => events.fetchNextPage()}
        >
          {events.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </MarketsAppShell>
  );
}

export default EventsDiscoverPage;
