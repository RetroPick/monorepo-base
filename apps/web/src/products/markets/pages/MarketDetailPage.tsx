import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MarketsApiError } from "@retropick/polymarket";

import { Breadcrumbs } from "../components/Breadcrumbs";
import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsReadLayout } from "../components/MarketsReadLayout";
import { OrderBookPanel } from "../components/OrderBookPanel";
import { OutcomeTabs } from "../components/OutcomeTabs";
import { ResolutionPanel } from "../components/ResolutionPanel";
import { TradingUnavailable } from "../components/TradingUnavailable";
import {
  useMarketsCapabilities,
  useMarketsMarket,
  useMarketsOrderBook,
} from "../hooks/useMarketsQueries";
import { mapQueryError } from "../lib/errors";
import { isDegradedFreshness } from "../lib/freshness";
import { isCanonicalMarketId } from "../lib/ids";
import { discoverPath } from "../routes/paths";

export function MarketDetailPage() {
  const { marketId = "" } = useParams();
  const decodedId = decodeURIComponent(marketId);
  const idValid = isCanonicalMarketId(decodedId);
  const market = useMarketsMarket(decodedId);

  const outcomes = market.data?.outcomes ?? [];
  const [selectedTokenId, setSelectedTokenId] = useState("");

  useEffect(() => {
    setSelectedTokenId("");
  }, [decodedId]);

  const tokenId = selectedTokenId || outcomes[0]?.upstreamId || "";

  const capabilities = useMarketsCapabilities();
  const realtimeEnabled = capabilities.data?.features?.realtime === true;

  const orderBookFetchEnabled =
    idValid &&
    Boolean(market.data) &&
    market.data?.capabilities.orderBook === true &&
    tokenId.length > 0;
  const pollingEnabled = orderBookFetchEnabled && !realtimeEnabled && market.data?.status === "open";

  const orderBook = useMarketsOrderBook(decodedId, tokenId, orderBookFetchEnabled, pollingEnabled);

  if (!idValid) {
    return (
      <MarketsReadLayout>
        <DataStateEmpty
          title="Invalid market identifier"
          description="Market links must use a RetroPick canonical ID (polymarket:market:…)."
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketsReadLayout>
    );
  }

  if (market.isLoading) {
    return (
      <MarketsReadLayout>
        <p className="text-sm text-muted-foreground">Loading market…</p>
      </MarketsReadLayout>
    );
  }

  if (market.error && !market.data) {
    const mapped = mapQueryError(market.error);
    const isNotFound =
      mapped.kind === "not_found" ||
      (market.error instanceof MarketsApiError && market.error.status === 404);
    return (
      <MarketsReadLayout>
        <DataStateEmpty
          title={isNotFound ? "Market not found" : "Could not load market"}
          description={
            isNotFound
              ? "This market is not in the RetroPick catalog."
              : mapped.message || "The RetroPick API could not return this market."
          }
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
        <DataStateBanner error={market.error} onRetry={() => market.refetch()} />
      </MarketsReadLayout>
    );
  }

  if (!market.data) {
    return (
      <MarketsReadLayout>
        <DataStateEmpty
          title="Market not found"
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketsReadLayout>
    );
  }

  return (
    <MarketsReadLayout>
      <Breadcrumbs
        eventId={market.data.eventId}
        eventTitle={undefined}
        marketQuestion={market.data.question}
      />

      <DataStateBanner error={market.error} onRetry={() => market.refetch()} />

      {isDegradedFreshness(market.data.freshness) ? <StaleBanner /> : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <header>
            <FreshnessBadge freshness={market.data.freshness} marketStatus={market.data.status} />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">{market.data.question}</h1>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{market.data.id}</p>
            {market.data.description ? (
              <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{market.data.description}</p>
            ) : null}
          </header>

          <OutcomeTabs
            outcomes={outcomes}
            selectedTokenId={tokenId}
            onSelect={setSelectedTokenId}
          />

          <ResolutionPanel resolution={market.data.resolution} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-medium">Order book</h3>
            <p className="mb-2 text-xs text-muted-foreground">
              {realtimeEnabled
                ? "Realtime unavailable in Phase 1 module — REST polling"
                : pollingEnabled
                  ? "Snapshot polling — not realtime"
                  : market.data.status === "open"
                    ? "Order book unavailable"
                    : "Final snapshot — polling disabled for closed markets"}
            </p>
            <OrderBookPanel snapshot={orderBook.data} isLoading={orderBook.isLoading} />
            <DataStateBanner error={orderBook.error} onRetry={() => orderBook.refetch()} />
          </div>

          <TradingUnavailable />
        </div>
      </section>
    </MarketsReadLayout>
  );
}

export default MarketDetailPage;
