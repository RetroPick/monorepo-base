import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { PolymarketEventCard } from "@/features/markets/components/PolymarketEventCard";
import { DataStateBanner, DataStateEmpty } from "@/features/markets/components/DataState";
import { FreshnessBadge } from "@/features/markets/components/FreshnessBadge";
import { useMarketsCapabilities, useMarketsEventsInfinite } from "@/features/markets/hooks/useMarketsQueries";
import { cn } from "@/lib/utils";

const gridClass =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3 xl:gap-5";

export function PolymarketDiscoverPanel() {
  const capabilities = useMarketsCapabilities();
  const events = useMarketsEventsInfinite();

  const allEvents = events.data?.pages.flatMap((p) => p.events) ?? [];
  const listFreshness = events.data?.pages[0]?.freshness;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-10 lg:pt-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Discover</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Polymarket events via RetroPick · read-only · trading unavailable
            </p>
          </div>
          {listFreshness ? <FreshnessBadge freshness={listFreshness} /> : null}
        </div>

        {capabilities.data ? (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded border border-border px-2 py-1">
              Catalog: {capabilities.data.catalog ? "on" : "off"}
            </span>
            <span className="rounded border border-border px-2 py-1">Trading: off</span>
            <span className="rounded border border-border px-2 py-1">
              Realtime: {capabilities.data.features?.realtime ? "on" : "off (polling)"}
            </span>
          </div>
        ) : null}

        <DataStateBanner error={events.error} onRetry={() => events.refetch()} />

        {events.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading Polymarket catalog…</p>
        ) : null}

        {!events.isLoading && !events.error && allEvents.length === 0 ? (
          <DataStateEmpty
            title="No events in catalog"
            description="Check MARKETS_CATALOG_ENABLED and backend Gamma connectivity."
          />
        ) : null}

        <div className={cn(gridClass)}>
          {allEvents.map((event) => (
            <PolymarketEventCard key={event.id} event={event} freshness={event.freshness} />
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
      </main>

      <Footer />
    </div>
  );
}

export default PolymarketDiscoverPanel;
