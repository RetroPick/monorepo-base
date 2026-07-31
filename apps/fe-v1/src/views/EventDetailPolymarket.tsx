import { Link, useParams } from "react-router-dom";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import { DataStateBanner, DataStateEmpty } from "@/features/markets/components/DataState";
import { FreshnessBadge } from "@/features/markets/components/FreshnessBadge";
import { marketSummaryToMarketCard } from "@/features/markets/adapters/eventToMarket";
import { formatProbability } from "@/features/markets/lib/decimal";
import { useMarketsEvent } from "@/features/markets/hooks/useMarketsQueries";
import type { Market } from "@/types/market";

export default function EventDetailPolymarket() {
  const { eventId = "" } = useParams();
  const decodedId = decodeURIComponent(eventId);
  const event = useMarketsEvent(decodedId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-6 lg:px-10">
        <Link to="/app/markets/all" className="text-sm text-primary hover:underline">
          ← Back to discover
        </Link>

        <DataStateBanner error={event.error} onRetry={() => event.refetch()} />

        {event.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading event…</p> : null}

        {event.data ? (
          <div className="mt-6 space-y-6">
            <header className="space-y-2">
              <FreshnessBadge freshness={event.data.freshness} marketStatus={event.data.status} />
              <h1 className="text-3xl font-semibold tracking-tight">{event.data.title}</h1>
              {event.data.description ? (
                <p className="max-w-3xl whitespace-pre-wrap text-muted-foreground">{event.data.description}</p>
              ) : null}
            </header>

            <section>
              <h2 className="mb-4 text-lg font-semibold">Markets ({event.data.markets.length})</h2>
              {event.data.markets.length === 0 ? (
                <DataStateEmpty title="No markets for this event" />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {event.data.markets.map((market) => {
                    const card = marketSummaryToMarketCard(market);
                    return (
                      <MarketCard
                        key={market.id}
                        market={card}
                        variant="discover"
                        href={`/app/market/${encodeURIComponent(market.id)}`}
                        navigationState={{ market: card as Market }}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 text-sm">
              <h3 className="font-medium">Provenance</h3>
              <p className="mt-2 text-muted-foreground">Source: {event.data.provenance.source}</p>
              <p className="text-muted-foreground">
                Observed: {new Date(event.data.provenance.observedAt).toLocaleString()}
              </p>
            </section>
          </div>
        ) : null}

        {!event.isLoading && !event.data && !event.error ? <DataStateEmpty title="Event not found" /> : null}
      </main>
      <Footer />
    </div>
  );
}
