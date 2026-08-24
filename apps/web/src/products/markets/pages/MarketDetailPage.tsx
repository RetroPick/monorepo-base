import { type ReactNode, useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, Code2, Link2, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { FastCryptoLiveTicker } from "../components/detail/FastCryptoLiveTicker";
import { PolymarketTradeBox } from "../components/detail/PolymarketTradeBox";
import { MarketRulesSection } from "../components/detail/MarketRulesSection";
import { MarketCommentsSection } from "../components/detail/MarketCommentsSection";
import { RelatedFastMarketsSidebar } from "../components/detail/RelatedFastMarketsSidebar";
import { TradingViewMarketChart } from "../components/detail/TradingViewMarketChart";
import { MarketCandidateRowsTable } from "../components/detail/MarketCandidateRowsTable";

import {
  useMarketsMarket,
  useMarketsEvent,
  useMarketsEventsInfinite,
} from "../hooks/useMarketsQueries";
import { useUserPortfolio } from "../hooks/useUserPortfolio";
import { MARKETS } from "../lib/retropickData";

function MarketDetailShell({ children }: { children: ReactNode }) {
  return (
    <MarketsAppShell title="Prediction Market" hideBottomNav>
      {children}
    </MarketsAppShell>
  );
}

export function MarketDetailPage() {
  const { marketId = "" } = useParams();
  const decodedId = decodeURIComponent(marketId);
  const { isWatchlisted, toggleWatchlist } = useUserPortfolio();
  const [copied, setCopied] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

  // Queries for canonical market or event
  const apiMarket = useMarketsMarket(decodedId);
  const apiEvent = useMarketsEvent(decodedId);
  const eventsInfinite = useMarketsEventsInfinite();

  // Find in cached infinite event stream
  const cachedEvent = useMemo(() => {
    if (!eventsInfinite.data?.pages) return null;
    for (const page of eventsInfinite.data.pages) {
      const match = page.events.find(
        (e: any) =>
          e.id === decodedId ||
          e.id.replace("polymarket:event:", "") === decodedId ||
          e.markets?.some((m: any) => m.id === decodedId),
      );
      if (match) return match;
    }
    return null;
  }, [eventsInfinite.data, decodedId]);

  // Local fallback catalog
  const localMarket =
    MARKETS.find(
      (m) =>
        m.id === decodedId ||
        m.id === decodedId.replace("polymarket:market:", "").replace("polymarket:event:", ""),
    ) || null;

  // Consolidate market data accurately
  const title =
    apiMarket.data?.question ||
    apiEvent.data?.title ||
    cachedEvent?.title ||
    localMarket?.question ||
    "Prediction Market";

  const image =
    (apiMarket.data as any)?.image ||
    (apiEvent.data as any)?.image ||
    (cachedEvent as any)?.image ||
    localMarket?.image ||
    "/images/markets/crypto/bitcoin.webp";

  const category =
    (apiMarket.data as any)?.category ||
    (apiEvent.data as any)?.category ||
    (cachedEvent as any)?.category ||
    localMarket?.category ||
    "Crypto";

  const volume =
    localMarket?.volume ||
    ((apiMarket.data as any)?.volume ? `$${Number((apiMarket.data as any).volume).toLocaleString()} Vol.` : "$16,581,088 Vol.");

  const endDate =
    localMarket?.timeLeft ||
    ((apiMarket.data as any)?.endAt ? new Date((apiMarket.data as any).endAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Dec 31, 2026");

  const probYes = (() => {
    if (apiMarket.data?.outcomes?.[0]?.price) {
      return Math.round(parseFloat(apiMarket.data.outcomes[0].price) * 100);
    }
    const yesOutcome = apiEvent.data?.markets?.[0]?.outcomes?.find((o) => o.name === "YES");
    if (yesOutcome?.price) {
      return Math.round(parseFloat(yesOutcome.price) * 100);
    }
    const cachedYes = (cachedEvent as any)?.markets?.[0]?.outcomes?.find((o: any) => o.name === "YES");
    if (cachedYes?.price) {
      return Math.round(parseFloat(cachedYes.price) * 100);
    }
    return localMarket?.yes ?? 50;
  })();

  const isMultiOutcome = Boolean(
    (localMarket?.options &&
      localMarket.options.length >= 2 &&
      (localMarket.marketType === "MULTIPLE_CHOICE" ||
        localMarket.marketType === "CONVERGENCE" ||
        localMarket.marketType === "RANGE")) ||
      ((apiEvent.data?.markets || (cachedEvent as any)?.markets)?.length > 1),
  );

  const options = (() => {
    if (!isMultiOutcome) return undefined;
    if (localMarket?.options && localMarket.options.length >= 2) {
      return localMarket.options;
    }
    const eventMarkets = apiEvent.data?.markets || (cachedEvent as any)?.markets;
    if (eventMarkets && eventMarkets.length > 1) {
      return eventMarkets.slice(0, 6).map((m: any) => ({
        label: m.groupItemTitle || m.question || "Option",
        percentage: Math.round(
          parseFloat(m.outcomes?.find((o: any) => o.name === "YES")?.price || "0.5") * 100,
        ),
      }));
    }
    return undefined;
  })();

  const titleLower = title.toLowerCase();
  const isFastCrypto =
    decodedId.includes("up-down") ||
    (titleLower.includes("up or down") &&
      (titleLower.includes("btc") ||
        titleLower.includes("eth") ||
        titleLower.includes("sol") ||
        titleLower.includes("5m") ||
        titleLower.includes("ethereum") ||
        titleLower.includes("bitcoin") ||
        titleLower.includes("solana")));

  const assetSymbol =
    titleLower.includes("eth") || titleLower.includes("ethereum")
      ? "ETH"
      : titleLower.includes("sol") || titleLower.includes("solana")
        ? "SOL"
        : titleLower.includes("xrp")
          ? "XRP"
          : titleLower.includes("doge")
            ? "DOGE"
            : "BTC";

  const basePrice =
    assetSymbol === "ETH"
      ? 3480.5
      : assetSymbol === "SOL"
        ? 188.2
        : assetSymbol === "XRP"
          ? 0.62
          : assetSymbol === "DOGE"
            ? 0.14
            : 64782.73;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <MarketDetailShell>
      {/* ============================================================ */}
      {/* MAIN 2-COLUMN LAYOUT: Left (Header + Chart + Rules) / Right  */}
      {/* ============================================================ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN (8 / 12) */}
        <div className="lg:col-span-8 space-y-5">
          {/* 1. Market Header Component (Matching Screenshot 4 Polymarket) */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <img
                src={image}
                alt={title}
                className="h-[54px] w-[54px] rounded-xl object-cover shrink-0 bg-[#0E1422] border border-white/[0.08] shadow-sm"
              />
              <div className="flex flex-col justify-between min-h-[54px] min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-400">
                  {category} · RetroPick Consensus
                </div>
                <h1 className="font-display text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
                  {title}
                </h1>
              </div>
            </div>

            {/* Header Action Icons */}
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pt-0.5">
              <button
                type="button"
                title="Embed Market"
                className="rounded-xl border border-white/[0.08] bg-[#0E1422] p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <Code2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                title={copied ? "Copied Link!" : "Copy Link"}
                className={cn(
                  "rounded-xl border border-white/[0.08] bg-[#0E1422] p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer",
                  copied ? "text-emerald-400 border-emerald-500/30" : "",
                )}
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  toggleWatchlist({
                    marketId: decodedId,
                    title,
                    category,
                    yesChance: probYes,
                    volume24h: volume,
                  })
                }
                title={isWatchlisted(decodedId) ? "Remove from Watchlist" : "Save to Watchlist"}
                className={cn(
                  "rounded-xl border border-white/[0.08] bg-[#0E1422] p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer",
                  isWatchlisted(decodedId) ? "text-amber-400 border-amber-500/30" : "",
                )}
              >
                <Bookmark className={cn("h-4 w-4", isWatchlisted(decodedId) ? "fill-amber-400 text-amber-400" : "")} />
              </button>
            </div>
          </div>

          {/* 2. Real-Time Interactive Chart */}
          {isFastCrypto ? (
            <FastCryptoLiveTicker
              marketId={decodedId}
              marketTitle={title}
              assetSymbol={assetSymbol}
              basePrice={basePrice}
              isUp={probYes >= 50}
            />
          ) : (
            <TradingViewMarketChart
              initialProbYes={probYes}
              marketTitle={title}
              category={category}
              volume={volume}
              endDate={endDate}
              options={options}
              selectedOptionIdx={selectedOptionIdx}
              onSelectOption={setSelectedOptionIdx}
            />
          )}

          {/* 3. Multi-Candidate Outcome Rows Table (only if genuine multi-choice / candidate market) */}
          {isMultiOutcome && options && options.length >= 2 && (
            <MarketCandidateRowsTable
              options={options}
              selectedOptionIdx={selectedOptionIdx}
              onSelectOption={(idx) => setSelectedOptionIdx(idx)}
            />
          )}

          {/* 4. Order Book Accordion + Settlement Rules Section */}
          <MarketRulesSection
            marketQuestion={title}
            category={category}
            resolutionSource={isFastCrypto ? "Chainlink TWAP BTC/USD Data Stream" : "Authoritative On-Chain Consensus"}
            endDate={isFastCrypto ? "Live 5-Minute Window" : endDate}
          />

          {/* 5. Community Comments & Discussion Thread */}
          <MarketCommentsSection marketQuestion={title} />
        </div>

        {/* RIGHT COLUMN (4 / 12) - STARTS AT THE VERY TOP LEVEL WITH HEADER */}
        <div className="lg:col-span-4 space-y-6">
          {/* 1. Polymarket One-Tap Trading Box */}
          <PolymarketTradeBox
            marketId={decodedId}
            marketTitle={title}
            category={category}
            image={image}
            isDirection={isFastCrypto}
            probYes={probYes}
            options={options}
            selectedOptionIdx={selectedOptionIdx}
            onSelectOptionIdx={setSelectedOptionIdx}
          />

          {/* 2. Related Fast Markets Stream */}
          <RelatedFastMarketsSidebar currentMarketId={decodedId} category={category} />
        </div>
      </section>
    </MarketDetailShell>
  );
}

export default MarketDetailPage;
