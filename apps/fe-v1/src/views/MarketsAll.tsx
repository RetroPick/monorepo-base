import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import DiscoverMarketTypesStrip from "@/components/discover/DiscoverMarketTypesStrip";
import DiscoverLeftNav from "@/components/discover/DiscoverLeftNav";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MarketCard from "@/components/MarketCard";
import { useIndexerWebSocket } from "@/hooks/useIndexerWebSocket";
import { DISCOVERY_VERTICALS } from "@/lib/discovery-verticals";
import type { DiscoveryVerticalId, MarketDiscoveryVerticalId } from "@/lib/discovery-verticals";
import { countByAsset, marketChainMatchesAsset, type CryptoAssetFilterId } from "@/lib/discover-crypto";
import { apiErrorSummary, fetchMarkets, type MarketRow } from "@/lib/api/retropickApi";
import {
  chainDetailPath,
  chainMarketIsLive,
  isDiscoverCryptoRow,
  isMarketPastSetup,
  marketRowToCardMarket,
  sortMarketsByActivity,
} from "@/lib/market-data/chainDiscover";
import { cn } from "@/lib/utils";
import type { Market } from "@/types/market";

const NON_CRYPTO_VERTICALS: ReadonlySet<MarketDiscoveryVerticalId> = new Set([
  "economics",
  "financials",
  "tech_science",
  "climate",
]);

const MARKETS_REFETCH_MS = 15_000;

type MarketsAllProps = { initialVertical?: DiscoveryVerticalId };

const MarketsAll = ({ initialVertical = "trending" }: MarketsAllProps = {}) => {
  const location = useLocation();
  const [activeVertical, setActiveVertical] = useState<DiscoveryVerticalId>(initialVertical);
  const [cryptoAssetFilter, setCryptoAssetFilter] = useState<CryptoAssetFilterId>("all");

  useEffect(() => {
    const v = (location.state as { discoverVertical?: DiscoveryVerticalId } | null)?.discoverVertical;
    if (v && DISCOVERY_VERTICALS.some((x) => x.id === v)) {
      setActiveVertical(v);
    }
  }, [location.state, location.key]);

  useIndexerWebSocket(true);

  /** Same key as ChainMarkets / useMarketCards / useIndexerWebSocket so list stays one cache (no stale discover-only rows). */
  const marketsQ = useQuery({
    queryKey: ["retropick-api", "markets"],
    queryFn: fetchMarkets,
    staleTime: 5_000,
    refetchInterval: MARKETS_REFETCH_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const chainRows = useMemo(() => marketsQ.data ?? [], [marketsQ.data]);
  const listableRows = useMemo(
    () => chainRows.filter((r) => isMarketPastSetup(r)),
    [chainRows],
  );
  const sortedRows = useMemo(() => sortMarketsByActivity(listableRows), [listableRows]);

  const { allMarkets, cryptoMarkets } = useMemo(() => {
    const all = sortedRows.map(marketRowToCardMarket);
    const crypto = sortedRows
      .filter((r) => isDiscoverCryptoRow(r))
      .map(marketRowToCardMarket);
    return { allMarkets: all, cryptoMarkets: crypto };
  }, [sortedRows]);

  const baseCryptoMarkets = cryptoMarkets;

  const horizonOptions = useMemo(
    () => [{ id: "all" as const, label: "All", count: baseCryptoMarkets.length }],
    [baseCryptoMarkets.length],
  );

  const assetOptions = useMemo(() => {
    const a = countByAsset(baseCryptoMarkets);
    return [
      { id: "all" as const, label: "All", count: baseCryptoMarkets.length },
      { id: "BTC" as const, label: "BTC", count: a.BTC },
      { id: "ETH" as const, label: "ETH", count: a.ETH },
      { id: "SOL" as const, label: "SOL", count: a.SOL },
      { id: "LINK" as const, label: "LINK", count: a.LINK },
    ];
  }, [baseCryptoMarkets]);

  const sourceMarkets: Market[] = (() => {
    if (NON_CRYPTO_VERTICALS.has(activeVertical as MarketDiscoveryVerticalId)) {
      return [];
    }
    if (activeVertical === "trending") {
      return allMarkets;
    }
    if (activeVertical === "crypto") {
      return baseCryptoMarkets;
    }
    return [];
  })();

  let filteredMarkets: Market[] = sourceMarkets;

  if (activeVertical === "crypto" && cryptoAssetFilter !== "all") {
    filteredMarkets = filteredMarkets.filter((m) => marketChainMatchesAsset(m, cryptoAssetFilter));
  }

  if (activeVertical === "trending") {
    filteredMarkets = [...filteredMarkets].sort((a, b) => {
      const aRow = listableRows.find((r) => r.templateId === a.id);
      const bRow = listableRows.find((r) => r.templateId === b.id);
      const aL = aRow && chainMarketIsLive(aRow) ? 1 : 0;
      const bL = bRow && chainMarketIsLive(bRow) ? 1 : 0;
      if (aL !== bL) return bL - aL;
      return 0;
    });
  } else {
    filteredMarkets = [...filteredMarkets].sort((a, b) => a.title.localeCompare(b.title));
  }

  const gridMarkets = filteredMarkets;

  const showCategoryEmpty = NON_CRYPTO_VERTICALS.has(activeVertical as MarketDiscoveryVerticalId);

  const showEmpty = showCategoryEmpty || gridMarkets.length === 0;

  const discoverGridGap =
    "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-2 lg:gap-6 xl:gap-5";
  /**
   * Trending “All markets” is full-width: 4 columns from `lg` so typical laptop/desktop
   * widths match a 4×N grid (not only from `xl` / 1280px). Crypto keeps 3 beside the nav.
   */
  /** `lg` + `xl` both set 4 cols so wide viewports always match even if one utility is missing from a stale CSS chunk. */
  const trendingMarketGridClass =
    "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:grid-cols-4 xl:gap-5";
  const gridClass = cn(discoverGridGap, "xl:grid-cols-3");

  const marketCardProps = (market: Market) => ({
    market,
    variant: "discover" as const,
    href: chainDetailPath(market.id),
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header
        discoveryNav={{
          verticals: DISCOVERY_VERTICALS,
          activeVerticalId: activeVertical,
          onVerticalChange: setActiveVertical,
        }}
      />

      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-10 lg:px-10 lg:pt-12">
        {marketsQ.isError ? (
          <p
            className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
            role="alert"
          >
            Could not load markets: {apiErrorSummary(marketsQ.error)}.
          </p>
        ) : null}
        {marketsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading indexed markets…</p>
        ) : null}
        {!marketsQ.isLoading && activeVertical === "trending" ? (
          <div className="flex flex-col gap-8" data-testid="discover-layout-trending">
            <DiscoverMarketTypesStrip />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">All markets</h2>
              <div
                className={cn("mt-4", trendingMarketGridClass)}
                data-testid="discover-trending-market-grid"
              >
                {gridMarkets.map((market) => (
                  <div key={market.id} className="min-h-0 w-full self-start">
                    <MarketCard {...marketCardProps(market)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !marketsQ.isLoading && activeVertical === "crypto" ? (
          <div
            className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10"
            data-testid="discover-layout-crypto"
          >
            <DiscoverLeftNav
              assetOptions={assetOptions}
              horizonOptions={horizonOptions}
              activeAsset={cryptoAssetFilter}
              activeHorizon="all"
              onAssetChange={setCryptoAssetFilter}
              onHorizonChange={() => {}}
            />
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Crypto</h1>
                <span className="text-sm text-muted-foreground">Indexed markets only</span>
              </div>
              <div className={gridClass}>
                {gridMarkets.map((market) => (
                  <div key={market.id} className="min-h-0 w-full self-start">
                    <MarketCard {...marketCardProps(market)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : !marketsQ.isLoading && showCategoryEmpty ? (
          <section
            className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center"
            data-testid="discover-empty-vertical"
          >
            <h2 className="text-lg font-semibold text-foreground">No markets in this category yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Categories will populate here once the API exposes tags for indexed templates. Use Trending or Crypto for
              on-chain markets.
            </p>
          </section>
        ) : !marketsQ.isLoading ? (
          <div className={gridClass}>
            {gridMarkets.map((market) => (
              <div key={market.id} className="min-h-0 w-full self-start">
                <MarketCard {...marketCardProps(market)} />
              </div>
            ))}
          </div>
        ) : null}

        {showEmpty && !showCategoryEmpty && !marketsQ.isLoading ? (
          <section className="mt-8 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <h2 className="text-lg font-semibold text-foreground">No markets match</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No indexed templates yet, or nothing matched your filters. Check{" "}
              <Link to="/app/markets/all" className="text-primary underline hover:text-primary/90">
                markets
              </Link>{" "}
              for the full list.
            </p>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default MarketsAll;
