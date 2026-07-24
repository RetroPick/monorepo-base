import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMarkets } from "@/context/MarketContext";
import { useAllMarkets } from "@/context/AllMarketsContext";
import { ManualMarketPage } from "@/features/manual-market/ManualMarketPage";
import { manualMarketFromDiscovery } from "@/features/manual-market/types";
import type { Market } from "@/types/market";

function ResolutionExtras({ market }: { market: Market }) {
  const isV1Market = Boolean(market.oracleSource ?? market.timeframe ?? market.lockRule);
  if (!isV1Market) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {market.oracleSource ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Oracle source
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">{market.oracleSource}</div>
        </div>
      ) : null}
      {market.timeframe ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Timeframe
          </div>
          <div className="mt-2 text-sm font-semibold text-foreground">{market.timeframe}</div>
        </div>
      ) : null}
      {market.lockRule ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Lock rule
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{market.lockRule}</div>
        </div>
      ) : null}
      {market.closeRule ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Close rule
          </div>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{market.closeRule}</div>
        </div>
      ) : null}
      {market.resolutionFormula ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Resolution formula
          </div>
          <div className="mt-2 text-sm leading-7 text-foreground">{market.resolutionFormula}</div>
        </div>
      ) : null}
      {market.invalidationRule ? (
        <div className="rounded-2xl border border-border/70 bg-card p-4 sm:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Invalid / refund policy
          </div>
          <div className="mt-2 text-sm leading-7 text-muted-foreground">{market.invalidationRule}</div>
        </div>
      ) : null}
    </div>
  );
}

const MarketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { markets } = useMarkets();
  const { markets: allMarkets } = useAllMarkets();

  const stateMarket = (location.state as { market?: (typeof markets)[0] })?.market;
  const market =
    stateMarket ??
    allMarkets.find((m) => m.id === id) ??
    markets.find((m) => m.id === id) ??
    null;

  const marketsForRelated =
    stateMarket || allMarkets.find((m) => m.id === id) ? allMarkets : markets;

  if (!market) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Market not found.</p>
      </div>
    );
  }

  const model = manualMarketFromDiscovery(market, marketsForRelated);
  const isV1Market = Boolean(market.oracleSource ?? market.timeframe ?? market.lockRule);

  return (
    <ManualMarketPage
      model={{
        ...model,
        resolutionExtras: isV1Market ? <ResolutionExtras market={market} /> : undefined,
      }}
      onBack={() => navigate(-1)}
      backLabel="Back to Markets"
    />
  );
};

export default MarketDetail;
