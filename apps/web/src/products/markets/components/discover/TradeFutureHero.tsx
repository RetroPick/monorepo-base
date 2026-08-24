"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, ChevronLeft, ChevronRight, Link2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { HeroTradingViewChart } from "./HeroTradingViewChart";
import { useMarketsEventsInfinite } from "../../hooks/useMarketsQueries";

interface TradeFutureHeroProps {
  onExploreClick?: () => void;
}

// 5 Rich Featured Trending Slides
const FEATURED_SLIDES = [
  {
    id: "btc-price-august",
    isLiveSports: false,
    tag: "Crypto · Monthly",
    title: "What price will Bitcoin hit in August?",
    image: "/images/markets/crypto/bitcoin.webp",
    volume: "$17M Vol",
    commentUser: "Alex765",
    commentText: "im cooked",
    prevTopic: "Dodgers MLB",
    nextTopic: "ETH L2 TVL",
    outcomes: [
      { label: "↓ 70,000", percentage: 16, color: "#F59E0B", history: [22, 20, 18, 17, 16, 16, 16, 16] },
      { label: "↓ 75,000", percentage: 64, color: "#3B82F6", history: [45, 52, 58, 62, 65, 63, 64, 64] },
      { label: "↓ 67,500", percentage: 9, color: "#EA580C", history: [15, 14, 12, 11, 10, 9, 9, 9] },
      { label: "↓ 72,500", percentage: 32, color: "#60A5FA", history: [28, 30, 31, 33, 32, 32, 32, 32] },
    ],
  },
  {
    id: "eth-l2-25b-tvl",
    isLiveSports: false,
    tag: "Crypto · Layer 2",
    title: "Which Ethereum L2 will reach $25B TVL first?",
    image: "/images/markets/crypto/layer2.webp",
    volume: "$14.2M Vol",
    commentUser: "L2Beat · 3h ago",
    commentText: "Base and Arbitrum leading Layer 2 growth",
    prevTopic: "BTC in August",
    nextTopic: "OpenAI GPT-6",
    outcomes: [
      { label: "Base", percentage: 58, color: "#3B82F6", history: [35, 42, 48, 52, 55, 57, 58, 58] },
      { label: "Arbitrum", percentage: 28, color: "#10B981", history: [40, 36, 32, 30, 29, 28, 28, 28] },
      { label: "Optimism", percentage: 9, color: "#EF4444", history: [15, 13, 11, 10, 9, 9, 9, 9] },
      { label: "zkSync", percentage: 5, color: "#8B5CF6", history: [10, 9, 8, 8, 6, 5, 5, 5] },
    ],
  },
  {
    id: "openai-gpt6-2025",
    isLiveSports: false,
    tag: "AI · Frontier Models",
    title: "Will OpenAI release GPT-6 before end of 2026?",
    image: "/images/markets/tech%20&%20AI/openAI.webp",
    volume: "$16.8M Vol",
    commentUser: "Reuters · 1d ago",
    commentText: "OpenAI Next-Gen Autonomous Reasoner",
    prevTopic: "ETH L2 TVL",
    nextTopic: "Fed Decision",
    outcomes: [
      { label: "Q4 2026", percentage: 71, color: "#10B981", history: [38, 45, 52, 59, 66, 69, 71, 71] },
      { label: "Q3 2026", percentage: 29, color: "#8B5CF6", history: [35, 31, 28, 27, 28, 29, 29, 29] },
      { label: "2027 or Later", percentage: 11, color: "#3B82F6", history: [20, 15, 13, 12, 11, 11, 11, 11] },
      { label: "Before Q2 2026", percentage: 2, color: "#EC4899", history: [7, 5, 4, 3, 2, 2, 2, 2] },
    ],
  },
  {
    id: "fed-decision-september",
    isLiveSports: false,
    tag: "Economics · Federal Reserve",
    title: "Fed Decision in September 2026: No Change or Cut?",
    image: "/images/markets/economics/Fed.webp",
    volume: "$37.5M Vol",
    commentUser: "WSJ · 5h ago",
    commentText: "Core CPI Cools Toward Target",
    prevTopic: "OpenAI GPT-6",
    nextTopic: "Dodgers MLB",
    outcomes: [
      { label: "No change", percentage: 71, color: "#3B82F6", history: [62, 68, 71, 74, 75, 73, 71, 71] },
      { label: "25 bps Rate Cut", percentage: 25, color: "#10B981", history: [30, 25, 22, 21, 23, 24, 25, 25] },
      { label: "25 bps Increase", percentage: 2, color: "#EF4444", history: [5, 4, 3, 3, 2, 2, 2, 2] },
      { label: "50+ bps Rate Cut", percentage: 2, color: "#F59E0B", history: [3, 3, 3, 4, 2, 2, 2, 2] },
    ],
  },
  {
    id: "dodgers-vs-rockies-live",
    isLiveSports: true,
    tag: "Sports · Baseball · MLB",
    title: "Dodgers vs. Rockies",
    image: "/images/markets/Sports/baseball.webp",
    team1: { name: "Dodgers", code: "LA", score: 7, prob: 95, color: "#3B82F6" },
    team2: { name: "Rockies", code: "CR", score: 5, prob: 6, color: "#A855F7" },
    volume: "$650K Vol",
    prevTopic: "Fed Decision",
    nextTopic: "BTC in August",
    timestamps: ["4:00 PM", "8:00 PM", "12:00 AM", "4:00 AM", "8:00 AM"],
    historyTeam1: [55, 56, 57, 57, 56, 78, 92, 95],
    historyTeam2: [45, 44, 43, 43, 44, 22, 8, 6],
  },
];

interface BreakingNewsItem {
  id: string;
  title: string;
  prob: number;
  delta: number | null;
}

const INITIAL_BREAKING_NEWS: BreakingNewsItem[] = [
  {
    id: "btc-price-august",
    title: "What price will Bitcoin hit in August?",
    prob: 64,
    delta: null,
  },
  {
    id: "eth-l2-25b-tvl",
    title: "Which Ethereum L2 will reach $25B TVL first?",
    prob: 58,
    delta: null,
  },
  {
    id: "fed-decision-september",
    title: "Fed Decision in September 2026: No Change or Cut?",
    prob: 71,
    delta: null,
  },
  {
    id: "openai-gpt6-2025",
    title: "Will OpenAI release GPT-6 before end of 2026?",
    prob: 71,
    delta: null,
  },
];

export function TradeFutureHero({ onExploreClick }: TradeFutureHeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedOutcomeIdx, setSelectedOutcomeIdx] = useState(0);
  const [activeTeamTab, setActiveTeamTab] = useState<"team1" | "team2">("team1");
  const [isPaused, setIsPaused] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Query actual live catalog events
  const eventsQuery = useMarketsEventsInfinite();
  const allEvents: any[] = useMemo(
    () => eventsQuery.data?.pages.flatMap((p) => p.events) ?? [],
    [eventsQuery.data],
  );

  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>(INITIAL_BREAKING_NEWS);

  useEffect(() => {
    if (allEvents.length === 0) return;

    const candidates: BreakingNewsItem[] = [];
    const sportsEvent = allEvents.find((e) => e.cardType === "vs_match" || e.category?.toLowerCase() === "sports");
    if (sportsEvent) {
      candidates.push({
        id: (sportsEvent.id || "").replace("polymarket:event:", ""),
        title: sportsEvent.title,
        prob: sportsEvent.teams?.[0]?.prob ?? 95,
        delta: null,
      });
    }

    const cryptoEvent = allEvents.find((e) => e.category?.toLowerCase() === "crypto");
    if (cryptoEvent) {
      candidates.push({
        id: (cryptoEvent.id || "").replace("polymarket:event:", ""),
        title: cryptoEvent.title,
        prob: cryptoEvent.rawMarket?.yes ?? 64,
        delta: null,
      });
    }

    const econEvent = allEvents.find((e) => e.category?.toLowerCase() === "economics" || e.category?.toLowerCase() === "economy");
    if (econEvent) {
      candidates.push({
        id: (econEvent.id || "").replace("polymarket:event:", ""),
        title: econEvent.title,
        prob: econEvent.rawMarket?.yes ?? 71,
        delta: null,
      });
    }

    const techEvent = allEvents.find((e) => e.category?.toLowerCase() === "tech" || e.category?.toLowerCase() === "financials");
    if (techEvent) {
      candidates.push({
        id: (techEvent.id || "").replace("polymarket:event:", ""),
        title: techEvent.title,
        prob: techEvent.rawMarket?.yes ?? 77,
        delta: null,
      });
    }

    if (candidates.length >= 3) {
      setBreakingNews(candidates.slice(0, 4));
    }
  }, [allEvents]);

  const slide = FEATURED_SLIDES[currentSlide];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % FEATURED_SLIDES.length);
    setSelectedOutcomeIdx(0);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + FEATURED_SLIDES.length) % FEATURED_SLIDES.length);
    setSelectedOutcomeIdx(0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/markets/m/${slide.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-rotate every 7s unless hovered
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, currentSlide]);

  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
      {/* ============================================================ */}
      {/* LEFT: Clean Minimalist Hero Card (Col 8 / 12)                */}
      {/* ============================================================ */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl lg:col-span-8 overflow-hidden min-h-[385px] lg:h-[395px] min-w-0"
      >
        {/* Top Header: Image + Tag + Title + Link/Bookmark Actions */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3.5">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="h-12 w-12 rounded-2xl overflow-hidden bg-[#121929] border border-white/10 shrink-0 shadow-sm flex items-center justify-center">
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-xs font-semibold text-slate-400">{slide.tag}</div>
              <Link
                to={`/markets/m/${slide.id}`}
                className="font-display text-lg sm:text-xl font-extrabold text-white hover:text-blue-400 transition-colors leading-snug line-clamp-1 block"
              >
                {slide.title}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400 shrink-0 pt-1">
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy Link"}
              className={cn(
                "rounded-xl p-1.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer",
                copied && "text-emerald-400",
              )}
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setBookmarked(!bookmarked)}
              title="Bookmark Market"
              className="rounded-xl p-1.5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <Bookmark className={cn("h-4 w-4", bookmarked ? "fill-white text-white" : "")} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {slide.isLiveSports ? (
          /* Live Sports Slide */
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center flex-1">
            <div className="sm:col-span-5 space-y-3 h-[185px] flex flex-col justify-between">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTeamTab("team1")}
                  className={cn(
                    "rounded-xl py-2 text-center text-xs font-black transition-all cursor-pointer border",
                    activeTeamTab === "team1"
                      ? "border-blue-500/50 bg-blue-600/20 text-blue-400"
                      : "border-white/5 bg-[#101726]/80 text-slate-400 hover:text-white",
                  )}
                >
                  Dodgers 95%
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTeamTab("team2")}
                  className={cn(
                    "rounded-xl py-2 text-center text-xs font-black transition-all cursor-pointer border",
                    activeTeamTab === "team2"
                      ? "border-purple-500/50 bg-purple-600/20 text-purple-400"
                      : "border-white/5 bg-[#101726]/80 text-slate-400 hover:text-white",
                  )}
                >
                  Rockies 6%
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-400 font-bold">
                  <span>Spread</span>
                  <span className="text-white font-mono">LAD -2.5 (2.5)</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 font-bold">
                  <span>Total</span>
                  <span className="text-white font-mono">O 12.5 (12.5)</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-mono font-bold pt-1">
                {slide.volume}
              </div>
            </div>

            <div className="sm:col-span-7 h-[185px]">
              <HeroTradingViewChart
                isLiveSports={true}
                sportsData={{
                  team1: slide.team1!,
                  team2: slide.team2!,
                  historyTeam1: slide.historyTeam1,
                  historyTeam2: slide.historyTeam2,
                  timestamps: slide.timestamps,
                }}
                activeTeamTab={activeTeamTab}
              />
            </div>
          </div>
        ) : (
          /* Multi-Outcome Slide */
          <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center flex-1">
            {/* Left Column: Clean Minimalist Text Rows + News/Comment */}
            <div className="sm:col-span-5 h-[190px] flex flex-col justify-between pr-2">
              <div className="space-y-2.5">
                {slide.outcomes?.map((out, idx) => {
                  const isSelected = selectedOutcomeIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedOutcomeIdx(idx)}
                      className="w-full flex items-center justify-between text-left group cursor-pointer"
                    >
                      <span
                        className={cn(
                          "text-sm font-semibold transition-colors pb-0.5",
                          isSelected
                            ? "text-white font-bold border-b-2"
                            : "text-slate-300 group-hover:text-white border-b-2 border-transparent",
                        )}
                        style={isSelected ? { borderColor: out.color } : {}}
                      >
                        {out.label}
                      </span>
                      <span className="font-mono text-base font-extrabold text-white">
                        {out.percentage}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Left: Comment / News Snippet + Volume */}
              <div className="pt-1 text-[11px] text-slate-400 space-y-0.5">
                {slide.commentUser && (
                  <p className="line-clamp-1 text-slate-400">
                    <span className="font-bold text-slate-300">{slide.commentUser}: </span>
                    <span>{slide.commentText}</span>
                  </p>
                )}
                <div className="text-xs font-mono font-bold text-slate-400 pt-0.5">
                  {slide.volume}
                </div>
              </div>
            </div>

            {/* Right Column: Clean Full Chart */}
            <div className="sm:col-span-7 h-[190px] flex flex-col justify-center pl-0 sm:pl-2">
              <div className="h-full w-full">
                <HeroTradingViewChart
                  isLiveSports={false}
                  outcomeData={{
                    outcomes: slide.outcomes,
                  }}
                  selectedOutcomeIdx={selectedOutcomeIdx}
                  onSelectOutcome={(idx) => setSelectedOutcomeIdx(idx)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Carousel Bottom Bar */}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
          {/* Pagination Indicators */}
          <div className="flex items-center gap-1.5">
            {FEATURED_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentSlide(idx);
                  setSelectedOutcomeIdx(0);
                }}
                title={`Slide ${idx + 1}`}
                className={cn(
                  "h-1 rounded-full transition-all cursor-pointer",
                  currentSlide === idx ? "w-6 bg-blue-500" : "w-1.5 bg-white/20 hover:bg-white/40",
                )}
              />
            ))}
          </div>

          {/* Prev / Next Topic Pills */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevSlide}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#161D2E] px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>{slide.prevTopic}</span>
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#161D2E] px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <span>{slide.nextTopic}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT: Breaking News & Hot Topics Sidebar (Col 4 / 12)       */}
      {/* ============================================================ */}
      <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl lg:col-span-4 transition-all min-h-[385px] lg:h-[395px]">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Breaking News ›
              </span>
            </div>
            <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-bold font-mono text-rose-400 animate-pulse">
              LIVE
            </span>
          </div>

          <div className="space-y-2">
            {breakingNews.map((item, idx) => {
              return (
                <Link
                  key={item.id || idx}
                  to={`/markets/m/${item.id}`}
                  className="group flex items-start justify-between gap-2.5 text-xs p-2 rounded-xl border border-transparent transition-all hover:bg-blue-600/10 hover:border-white/5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="font-mono text-slate-500 font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-200 group-hover:text-blue-400 font-semibold line-clamp-2 leading-snug">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-1">
                    <span className="font-mono font-black text-xs transition-colors text-white">
                      {item.prob}%
                    </span>
                    {item.delta != null ? (
                      <span
                        className={cn(
                          "text-[10px] font-bold font-mono",
                          item.delta >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {item.delta >= 0 ? `↗ ${item.delta}%` : `↘ ${Math.abs(item.delta)}%`}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between mb-2 text-xs font-bold text-slate-400">
            <span className="hover:text-white cursor-pointer">Hot topics ›</span>
          </div>
          <button
            type="button"
            onClick={onExploreClick}
            className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all cursor-pointer text-center shadow-lg shadow-blue-600/25"
          >
            Explore all
          </button>
        </div>
      </div>
    </section>
  );
}

export default TradeFutureHero;
