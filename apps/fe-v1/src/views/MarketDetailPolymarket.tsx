import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import type { HistoryInterval } from "@retropick/polymarket";
import { MarketsApiError } from "@retropick/polymarket";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Icon from "@/components/Icon";
import { DataStateBanner, DataStateEmpty } from "@/features/markets/components/DataState";
import { FreshnessBadge } from "@/features/markets/components/FreshnessBadge";
import { OrderBookPanel } from "@/features/markets/components/OrderBookPanel";
import { PriceChart } from "@/features/markets/components/PriceChart";
import { formatProbability } from "@/features/markets/lib/decimal";
import { mapQueryError } from "@/features/markets/lib/errors";
import {
  useMarketsHealth,
  useMarketsMarket,
  useMarketsOrderBook,
  useMarketsPriceHistory,
} from "@/features/markets/hooks/useMarketsQueries";
import { isPolymarketResourceId } from "@/features/markets/adapters/eventToMarket";

const INTERVALS: HistoryInterval[] = ["1h", "6h", "1d", "1w", "max"];

function MarketDetailState({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-3 lg:px-8">
        <Link
          to="/app/markets/all"
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow_back" className="text-lg" />
          Back to Discover
        </Link>
        <DataStateEmpty title={title} description={description} />
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default function MarketDetailPolymarket() {
  const { id = "" } = useParams();
  const decodedId = decodeURIComponent(id);
  const idValid = isPolymarketResourceId(decodedId);
  const market = useMarketsMarket(decodedId);

  const outcomes = market.data?.outcomes ?? [];
  const [selectedTokenId, setSelectedTokenId] = useState("");

  useEffect(() => {
    setSelectedTokenId("");
  }, [decodedId]);

  const tokenId = selectedTokenId || outcomes[0]?.upstreamId || "";

  const orderBookFetchEnabled =
    idValid &&
    Boolean(market.data) &&
    market.data?.capabilities.orderBook === true &&
    tokenId.length > 0;
  const orderBookPollingEnabled = orderBookFetchEnabled && market.data?.status === "open";

  const orderBook = useMarketsOrderBook(
    decodedId,
    tokenId,
    orderBookFetchEnabled,
    orderBookPollingEnabled,
  );
  const [interval, setInterval] = useState<HistoryInterval>("1d");
  const history = useMarketsPriceHistory(idValid ? decodedId : "", tokenId, interval);
  const health = useMarketsHealth(idValid ? decodedId : "", tokenId);

  const selectedOutcome = useMemo(
    () => outcomes.find((o) => o.upstreamId === tokenId),
    [outcomes, tokenId],
  );

  if (!idValid) {
    return (
      <MarketDetailState
        title="Invalid market identifier"
        description="Market links must use a RetroPick Polymarket resource ID (polymarket:…)."
      />
    );
  }

  if (market.isLoading) {
    return (
      <MarketDetailState title="Loading market…" description="Fetching the latest market data from RetroPick." />
    );
  }

  if (market.error && !market.data) {
    const mapped = mapQueryError(market.error);
    const isNotFound =
      mapped.kind === "not_found" ||
      (market.error instanceof MarketsApiError && market.error.status === 404);
    return (
      <MarketDetailState
        title={isNotFound ? "Market not found" : "Could not load market"}
        description={
          isNotFound
            ? "This market is not in the RetroPick catalog."
            : mapped.message || "The RetroPick API could not return this market."
        }
      >
        <DataStateBanner error={market.error} onRetry={() => market.refetch()} />
      </MarketDetailState>
    );
  }

  if (!market.data) {
    return (
      <MarketDetailState
        title="Market not found"
        description="This market is not in the RetroPick catalog."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-3 lg:px-8">
        <Link
          to={market.data.eventId ? `/app/events/${encodeURIComponent(market.data.eventId)}` : "/app/markets/all"}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="arrow_back" className="text-lg" />
          Back
        </Link>

        <DataStateBanner error={market.error} onRetry={() => market.refetch()} />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-border/70 bg-card p-6 shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)] lg:p-8">
            <FreshnessBadge freshness={market.data.freshness} marketStatus={market.data.status} />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight lg:text-4xl">{market.data.question}</h1>
            {market.data.description ? (
              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground whitespace-pre-wrap">
                {market.data.description}
              </p>
            ) : null}

            {outcomes.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Outcomes">
                {outcomes.map((outcome) => (
                  <button
                    key={outcome.id}
                    type="button"
                    role="tab"
                    aria-selected={tokenId === outcome.upstreamId}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      tokenId === outcome.upstreamId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setSelectedTokenId(outcome.upstreamId)}
                  >
                    {outcome.name}
                    {outcome.price ? ` · ${formatProbability(outcome.price)}` : ""}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-8">
              <h3 className="mb-3 text-sm font-medium">Price history</h3>
              <div className="mb-3 flex flex-wrap gap-1">
                {INTERVALS.map((iv) => (
                  <button
                    key={iv}
                    type="button"
                    className={`rounded px-2 py-1 text-xs ${
                      interval === iv ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                    onClick={() => setInterval(iv)}
                  >
                    {iv}
                  </button>
                ))}
              </div>
              <PriceChart history={history.data} isLoading={history.isLoading} />
              <DataStateBanner error={history.error} onRetry={() => history.refetch()} />
            </div>

            {market.data.resolution ? (
              <div className="mt-8 rounded-2xl border border-border/70 bg-background/75 p-5 text-sm">
                <h3 className="font-medium">Resolution rules</h3>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                  {market.data.resolution.description}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card p-5">
              <h3 className="mb-3 text-sm font-medium">
                Order book {selectedOutcome ? `· ${selectedOutcome.name}` : ""}
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">
                {orderBookPollingEnabled
                  ? "Snapshot polling — not realtime"
                  : market.data.status === "open"
                    ? "Order book unavailable"
                    : "Final snapshot — polling disabled for closed markets"}
              </p>
              <OrderBookPanel snapshot={orderBook.data} isLoading={orderBook.isLoading} />
              <DataStateBanner error={orderBook.error} onRetry={() => orderBook.refetch()} />
            </div>

            {health.data ? (
              <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm">
                <h3 className="mb-2 font-medium">Market health</h3>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Bid depth</dt>
                    <dd className="font-mono">{health.data.bidDepth}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ask depth</dt>
                    <dd className="font-mono">{health.data.askDepth}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div className="rounded-2xl border border-dashed border-border p-5">
              <h3 className="text-sm font-medium">Trade</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Order placement is unavailable in Phase 1.2.
              </p>
              <button
                type="button"
                disabled
                className="mt-3 w-full cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                Trading unavailable
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
