import { useState } from "react";
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

import { useMarketsEvent } from "../hooks/useMarketsQueries";
import { MARKETS } from "../lib/retropickData";

export function EventDetailPage() {
  const { eventId = "" } = useParams();
  const decodedId = decodeURIComponent(eventId);
  const event = useMarketsEvent(decodedId);

  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState(0);

  // Match local market catalog or derive from API
  const localMarket =
    MARKETS.find((m) => m.id === decodedId || m.id === decodedId.replace("polymarket:event:", "")) ||
    MARKETS[0];

  const title = event.data?.title || localMarket?.question || "Prediction Market";
  const image = (event.data as any)?.image || localMarket?.image || "/images/markets/crypto/bitcoin.webp";
  const category = (event.data as any)?.category || localMarket?.category || "Crypto";
  const probYes = localMarket?.yes ?? 55;

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
    <MarketsAppShell title="Event" hideBottomNav>
      <div className="mb-3">
        <Breadcrumbs eventId={decodedId} eventTitle={title} />
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column (8/12) with Header */}
        <div className="lg:col-span-8 space-y-5">
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
                onClick={() => setBookmarked(!bookmarked)}
                title="Bookmark Market"
                className={cn(
                  "rounded-xl border border-white/[0.08] bg-[#0E1422] p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer",
                  bookmarked ? "text-white fill-white" : "",
                )}
              >
                <Bookmark className={cn("h-4 w-4", bookmarked ? "fill-white text-white" : "")} />
              </button>
            </div>
          </div>

          {/* Chart */}
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
              options={localMarket?.options}
              selectedOptionIdx={selectedOptionIdx}
              onSelectOption={setSelectedOptionIdx}
            />
          )}

          {/* Candidate rows if options */}
          {localMarket?.options && localMarket.options.length >= 2 && (
            <MarketCandidateRowsTable
              options={localMarket.options}
              selectedOptionIdx={selectedOptionIdx}
              onSelectOption={(idx) => setSelectedOptionIdx(idx)}
            />
          )}

          <MarketRulesSection
            marketQuestion={title}
            category={category}
            resolutionSource="Official On-Chain TWAP & Authoritative Consensus"
            endDate={localMarket?.timeLeft || "Active Event Window"}
          />

          <MarketCommentsSection marketQuestion={title} />
        </div>

        {/* Right Column (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          <PolymarketTradeBox
            marketId={decodedId}
            marketTitle={title}
            image={image}
            isDirection={isFastCrypto}
            probYes={probYes}
            options={localMarket?.options}
            selectedOptionIdx={selectedOptionIdx}
            onSelectOptionIdx={setSelectedOptionIdx}
          />

          <RelatedFastMarketsSidebar currentMarketId={decodedId} category={category} />
        </div>
      </section>
    </MarketsAppShell>
  );
}

export default EventDetailPage;
