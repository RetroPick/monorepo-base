import { type ReactNode, useEffect, useState } from "react";
import type { HistoryInterval } from "@retropick/polymarket";
import { Link, useParams } from "react-router-dom";
import { MarketsApiError } from "@retropick/polymarket";

import { Breadcrumbs } from "../components/Breadcrumbs";
import { DataStateBanner, DataStateEmpty, StaleBanner } from "../components/DataState";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketHealthPanel, PriceHistoryPanel, RelatedMarketsPanel } from "../components/MarketDataPanels";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { OrderBookPanel } from "../components/OrderBookPanel";
import { OutcomeTabs } from "../components/OutcomeTabs";
import { ResolutionPanel } from "../components/ResolutionPanel";
import { TradeAside, TradeMobileBar, TradeSheet } from "../components/trading/TradeSheet";
import { OrderTicketPanel } from "../trading";
import {
  useMarketsCapabilities,
  useMarketsEvent,
  useMarketsMarket,
  useMarketsMarketHealth,
  useMarketsOrderBook,
  useMarketsPriceHistory,
} from "../hooks/useMarketsQueries";
import { mapQueryError } from "../lib/errors";
import { isDegradedFreshness } from "../lib/freshness";
import { isCanonicalMarketId } from "../lib/ids";
import { discoverPath } from "../routes/paths";

function MarketDetailShell({ children }: { children: ReactNode }) {
  return (
    <MarketsAppShell title="Market" hideBottomNav>
      {children}
    </MarketsAppShell>
  );
}

export function MarketDetailPage() {
  const { marketId = "" } = useParams();
  const decodedId = decodeURIComponent(marketId);
  const idValid = isCanonicalMarketId(decodedId);
  const market = useMarketsMarket(decodedId);
  const [tradeOpen, setTradeOpen] = useState(false);

  const outcomes = market.data?.outcomes ?? [];
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<string | undefined>();
  const [historyInterval] = useState<HistoryInterval>("1d");

  useEffect(() => {
    setSelectedTokenId("");
    setSelectedPrice(undefined);
    setTradeOpen(false);
  }, [decodedId]);

  const tokenId = selectedTokenId || outcomes[0]?.upstreamId || "";

  const capabilities = useMarketsCapabilities();
  const realtimeEnabled = capabilities.data?.features?.realtime === true;

  const orderBookFetchEnabled =
    idValid &&
    Boolean(market.data) &&
    market.data?.capabilities.orderBook === true &&
    tokenId.length > 0;
  // The API capability describes server readiness, not a browser subscription.
  // Keep polling until this page owns a healthy realtime consumer.
  const pollingEnabled = orderBookFetchEnabled && market.data?.status === "open";

  const orderBook = useMarketsOrderBook(decodedId, tokenId, orderBookFetchEnabled, pollingEnabled);
  const historyFetchEnabled = idValid && Boolean(market.data) && market.data?.capabilities.history === true && tokenId.length > 0;
  const priceHistory = useMarketsPriceHistory(decodedId, tokenId, historyInterval, historyFetchEnabled);
  const marketHealth = useMarketsMarketHealth(decodedId, tokenId, orderBookFetchEnabled);
  const event = useMarketsEvent(market.data?.eventId ?? "");

  const orderTicket = market.data ? (
    <OrderTicketPanel
      market={market.data}
      tokenId={tokenId}
      outcomeName={outcomes.find((o) => o.upstreamId === tokenId)?.name}
      orderBook={orderBook.data}
      selectedPrice={selectedPrice}
      onPriceConsumed={() => setSelectedPrice(undefined)}
    />
  ) : null;

  if (!idValid) {
    return (
      <MarketDetailShell>
        <DataStateEmpty
          title="Invalid market identifier"
          description="Market links must use a RetroPick canonical ID (polymarket:market:…)."
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketDetailShell>
    );
  }

  if (market.isLoading) {
    return (
      <MarketDetailShell>
        <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading market">
          <div className="h-32 rounded-xl bg-elevated" />
          <div className="h-48 rounded-xl bg-elevated" />
        </div>
      </MarketDetailShell>
    );
  }

  if (market.error && !market.data) {
    const mapped = mapQueryError(market.error);
    const isNotFound =
      mapped.kind === "not_found" ||
      (market.error instanceof MarketsApiError && market.error.status === 404);
    return (
      <MarketDetailShell>
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
      </MarketDetailShell>
    );
  }

  if (!market.data) {
    return (
      <MarketDetailShell>
        <DataStateEmpty
          title="Market not found"
          action={
            <Link to={discoverPath()} className="text-sm text-primary hover:underline">
              Back to Discover
            </Link>
          }
        />
      </MarketDetailShell>
    );
  }

  return (
    <MarketDetailShell>
      <Breadcrumbs
        eventId={market.data.eventId}
        eventTitle={undefined}
        marketQuestion={market.data.question}
      />

      <DataStateBanner error={market.error} onRetry={() => market.refetch()} />

      {isDegradedFreshness(market.data.freshness) ? <StaleBanner /> : null}

      <section className="grid gap-6 pb-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-start lg:pb-0">
        <div className="space-y-6">
          <header className="rounded-xl border border-border bg-card p-6">
            <FreshnessBadge freshness={market.data.freshness} marketStatus={market.data.status} />
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
              {market.data.question}
            </h1>
            {market.data.description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{market.data.description}</p>
            ) : null}
            {market.data.endAt ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Ends <time dateTime={market.data.endAt}>{new Date(market.data.endAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</time>
              </p>
            ) : null}
          </header>

          <div className="rounded-xl border border-border bg-card p-5">
            <OutcomeTabs outcomes={outcomes} selectedTokenId={tokenId} onSelect={setSelectedTokenId} />
          </div>

          <ResolutionPanel resolution={market.data.resolution} />

          <PriceHistoryPanel
            error={priceHistory.error}
            history={priceHistory.data}
            isLoading={priceHistory.isLoading}
            onRetry={() => priceHistory.refetch()}
          />

          <MarketHealthPanel
            error={marketHealth.error}
            health={marketHealth.data}
            isLoading={marketHealth.isLoading}
            onRetry={() => marketHealth.refetch()}
          />

          <RelatedMarketsPanel currentMarketId={market.data.id} markets={event.data?.markets} />
        </div>

        <TradeAside className="space-y-4 market-manual-trade-aside">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-bold text-foreground">Order book</h3>
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
          {orderTicket}
        </TradeAside>
      </section>

      <TradeMobileBar onOpen={() => setTradeOpen(true)} label="Trade" />
      <TradeSheet open={tradeOpen} onClose={() => setTradeOpen(false)} title="Place order">
        {orderTicket}
      </TradeSheet>
    </MarketDetailShell>
  );
}

export default MarketDetailPage;
