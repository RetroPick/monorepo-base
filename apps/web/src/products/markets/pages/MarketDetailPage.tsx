import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MarketsApiError } from "@retropick/polymarket";

import { Breadcrumbs } from "../components/Breadcrumbs";
import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsShellLayout } from "../components/MarketsShellLayout";
import { OrderBookPanel } from "../components/OrderBookPanel";
import { OutcomeTabs } from "../components/OutcomeTabs";
import { ResolutionPanel } from "../components/ResolutionPanel";
import { OrderTicketPanel } from "../trading";
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
  const [selectedPrice, setSelectedPrice] = useState<string | undefined>();

  useEffect(() => {
    setSelectedTokenId("");
    setSelectedPrice(undefined);
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
      <MarketsShellLayout>
        <DataStateEmpty
          title="Invalid market identifier"
          description="Market links must use a RetroPick canonical ID (polymarket:market:…)."
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketsShellLayout>
    );
  }

  if (market.isLoading) {
    return (
      <MarketsShellLayout>
        <p className="text-sm text-muted-foreground">Loading market…</p>
      </MarketsShellLayout>
    );
  }

  if (market.error && !market.data) {
    const mapped = mapQueryError(market.error);
    const isNotFound =
      mapped.kind === "not_found" ||
      (market.error instanceof MarketsApiError && market.error.status === 404);
    return (
      <MarketsShellLayout>
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
      </MarketsShellLayout>
    );
  }

  if (!market.data) {
    return (
      <MarketsShellLayout>
        <DataStateEmpty
          title="Market not found"
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketsShellLayout>
    );
  }

  return (
    <MarketsShellLayout>
      <Breadcrumbs
        eventId={market.data.eventId}
        eventTitle={undefined}
        marketQuestion={market.data.question}
      />

      <DataStateBanner error={market.error} onRetry={() => market.refetch()} />

      {isDegradedFreshness(market.data.freshness) ? <StaleBanner /> : null}

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="space-y-6">
          <header className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm dark:border-white/[0.08]">
            <FreshnessBadge freshness={market.data.freshness} marketStatus={market.data.status} />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{market.data.question}</h1>
            {market.data.description ? (
              <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{market.data.description}</p>
            ) : null}
          </header>

          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08]">
            <OutcomeTabs outcomes={outcomes} selectedTokenId={tokenId} onSelect={setSelectedTokenId} />
          </div>

          <ResolutionPanel resolution={market.data.resolution} />
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08]">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Order book</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              {realtimeEnabled
                ? "Realtime unavailable in Phase 1 module — REST polling"
                : pollingEnabled
                  ? "Snapshot polling — not realtime"
                  : market.data.status === "open"
                    ? "Order book unavailable"
                    : "Final snapshot — polling disabled for closed markets"}
            </p>
            <OrderBookPanel
              snapshot={orderBook.data}
              isLoading={orderBook.isLoading}
              onSelectPrice={setSelectedPrice}
            />
            <DataStateBanner error={orderBook.error} onRetry={() => orderBook.refetch()} />
          </div>

          <OrderTicketPanel
            market={market.data}
            tokenId={tokenId}
            outcomeName={outcomes.find((o) => o.upstreamId === tokenId)?.name}
            orderBook={orderBook.data}
            selectedPrice={selectedPrice}
            onPriceConsumed={() => setSelectedPrice(undefined)}
          />
        </div>
      </section>
    </MarketsShellLayout>
  );
}

export default MarketDetailPage;
