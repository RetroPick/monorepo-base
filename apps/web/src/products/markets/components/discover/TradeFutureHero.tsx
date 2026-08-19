import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Share2, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface TradeFutureHeroProps {
  onExploreClick?: () => void;
}

// 5 Rich Featured Slides (Including Live Sports & Live Events matching Polymarket)
const FEATURED_SLIDES = [
  {
    id: "dodgers-vs-rockies-live",
    isLiveSports: true,
    tag: "Sports · Baseball · MLB",
    title: "Dodgers vs. Rockies",
    image: "/images/markets/Sports/baseball.webp",
    team1: { name: "Dodgers", code: "LA", score: 7, prob: 95, color: "#3B82F6" },
    team2: { name: "Rockies", code: "CR", score: 5, prob: 6, color: "#A855F7" },
    liveStatus: "End 8th",
    spread: { options: ["1.5", "2.5", "3.5"], selected: "2.5", opt1: "LAD -2.5", opt2: "COL +2.5" },
    total: { options: ["1.5", "12.5", "13."], selected: "12.5", opt1: "O 12.5", opt2: "U 12.5" },
    volume: "$650K Vol",
    ends: "Live Now",
    prevTopic: "NVIDIA $5T",
    nextTopic: "OpenAI GPT-6",
    timestamps: ["4:00 PM", "8:00 PM", "12:00 AM", "4:00 AM", "8:00 AM"],
    historyTeam1: [55, 55, 56, 56, 57, 57, 57, 56, 57, 57, 55, 78, 92, 95],
    historyTeam2: [45, 45, 44, 44, 43, 43, 43, 44, 43, 43, 45, 22, 8, 6],
  },
  {
    id: "openai-gpt6-2025",
    isLiveSports: false,
    tag: "AI · Frontier Models",
    title: "Will OpenAI release GPT-6 before end of 2026?",
    image: "/images/markets/tech%20&%20AI/openAI.webp",
    volume: "$16.8M Vol",
    ends: "Ends Dec 31, 2026",
    news: "OpenAI Next-Gen Autonomous Reasoner Prepares for High-Compute Benchmark Runs",
    newsSource: "Reuters · 1d ago",
    prevTopic: "Dodgers vs. Rockies",
    nextTopic: "Fed Decision",
    outcomes: [
      { label: "Q4 2026", percentage: 71, color: "#10B981", history: [38, 42, 48, 52, 55, 59, 62, 66, 69, 71] },
      { label: "Q3 2026", percentage: 29, color: "#8B5CF6", history: [35, 34, 31, 29, 28, 26, 27, 25, 28, 29] },
      { label: "2027 or Later", percentage: 11, color: "#3B82F6", history: [20, 18, 15, 14, 13, 12, 12, 11, 11, 11] },
      { label: "Before Q2 2026", percentage: 2, color: "#EC4899", history: [7, 6, 6, 5, 4, 3, 3, 2, 2, 2] },
    ],
  },
  {
    id: "fed-decision-september",
    isLiveSports: false,
    tag: "Economics · Federal Reserve",
    title: "Fed Decision in September 2026: No Change or Cut?",
    image: "/images/markets/economics/Fed.webp",
    volume: "$37.5M Vol",
    ends: "Ends Sep 30, 2026",
    news: "Core CPI Cools Toward Target as Central Bank Weighs Sustained Monetary Policy",
    newsSource: "WSJ · 5h ago",
    prevTopic: "OpenAI GPT-6",
    nextTopic: "Bitcoin Target",
    outcomes: [
      { label: "No change", percentage: 71, color: "#3B82F6", history: [62, 65, 68, 70, 71, 73, 74, 75, 75, 71] },
      { label: "25 bps Rate Cut", percentage: 25, color: "#10B981", history: [30, 28, 25, 23, 22, 21, 22, 21, 23, 25] },
      { label: "25 bps Increase", percentage: 2, color: "#EF4444", history: [5, 4, 4, 4, 3, 3, 2, 2, 2, 2] },
      { label: "50+ bps Rate Cut", percentage: 2, color: "#F59E0B", history: [3, 3, 3, 3, 4, 3, 2, 2, 2, 2] },
    ],
  },
  {
    id: "btc-150k-2027",
    isLiveSports: false,
    tag: "Crypto · Bitcoin Target",
    title: "Will Bitcoin hit $150,000 before Jan 1, 2027?",
    image: "/images/markets/crypto/bitcoin.webp",
    volume: "$24.5M Vol",
    ends: "Ends Jan 1, 2027",
    news: "Global Institutional Inflows Surge to All-Time High as Sovereign Funds Accumulate BTC",
    newsSource: "CoinDesk · 4h ago",
    prevTopic: "Fed Decision",
    nextTopic: "NVIDIA $5T",
    outcomes: [
      { label: "Hits $150K+", percentage: 64, color: "#10B981", history: [40, 44, 48, 52, 56, 58, 60, 62, 63, 64] },
      { label: "Peaks $120K-$150K", percentage: 24, color: "#3B82F6", history: [35, 33, 30, 28, 27, 26, 25, 24, 24, 24] },
      { label: "Reaches $200K+", percentage: 18, color: "#F59E0B", history: [10, 11, 13, 14, 15, 16, 17, 18, 18, 18] },
      { label: "Drops Below $60K", percentage: 4, color: "#EF4444", history: [15, 12, 9, 6, 5, 4, 4, 4, 4, 4] },
    ],
  },
  {
    id: "nvidia-market-cap-5t",
    isLiveSports: false,
    tag: "Financials · Semiconductors",
    title: "Will NVIDIA reach $5 Trillion market cap in 2026?",
    image: "/images/markets/finance/nvidia.webp",
    volume: "$1.4M Vol",
    ends: "Ends Dec 31, 2026",
    news: "Blackwell Ultra Architecture Demand Exceeds Guidance with Record Data Center Backlogs",
    newsSource: "Bloomberg · 3h ago",
    prevTopic: "Bitcoin Target",
    nextTopic: "Dodgers vs. Rockies",
    outcomes: [
      { label: "Yes by End of 2026", percentage: 77, color: "#10B981", history: [55, 58, 62, 66, 68, 70, 72, 74, 75, 77] },
      { label: "No / After 2027", percentage: 23, color: "#EF4444", history: [45, 42, 38, 34, 32, 30, 28, 26, 25, 23] },
    ],
  },
];

const BREAKING_NEWS = [
  { id: "dodgers-vs-rockies-live", title: "Dodgers take 7-5 lead against Rockies in Bottom of 8th", prob: 95, delta: 39 },
  { id: "btc-150k-2027", title: "Will Bitcoin hit $150,000 before January 1, 2027?", prob: 64, delta: 12 },
  { id: "fed-decision-september", title: "Fed Decision in September 2026: No Change or Cut?", prob: 71, delta: 8 },
  { id: "nvidia-market-cap-5t", title: "Will NVIDIA reach $5 Trillion market cap in 2026?", prob: 77, delta: -4 },
];

// Helper: Polymarket Live Step-Line Path Builder
function getStepPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    d += ` L ${curr.x.toFixed(1)},${prev.y.toFixed(1)} L ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

// Helper: Bezier Cubic Spline
function getSplinePath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function TradeFutureHero({ onExploreClick }: TradeFutureHeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedOutcomeIdx, setSelectedOutcomeIdx] = useState(0);
  const [activeTeamTab, setActiveTeamTab] = useState<"team1" | "team2">("team1");
  const [isPaused, setIsPaused] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slide = FEATURED_SLIDES[currentSlide];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % FEATURED_SLIDES.length);
    setSelectedOutcomeIdx(0);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + FEATURED_SLIDES.length) % FEATURED_SLIDES.length);
    setSelectedOutcomeIdx(0);
  };

  // Auto-rotate every 6.5s unless hovered
  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 6500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, currentSlide]);

  return (
    <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
      {/* ============================================================ */}
      {/* LEFT: Live Trending Carousel Hero Card (Col 8 / 12)          */}
      {/* ============================================================ */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 sm:p-5 shadow-xl lg:col-span-8 overflow-hidden transition-all min-w-0"
      >
        {/* Ambient Top Glow */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-600/15 blur-3xl"
          aria-hidden
        />

        {/* ------------------------------------------------------------ */}
        {/* SLIDE TYPE 1: Polymarket Live Sports (Dodgers vs Rockies)     */}
        {/* ------------------------------------------------------------ */}
        {slide.isLiveSports ? (
          <div>
            {/* Top Match Header: Tags + Live Score Center + Actions */}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] pb-3.5">
              {/* Left Title */}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-400">{slide.tag}</div>
                <Link
                  to={`/markets/m/${slide.id}`}
                  className="font-display text-xl sm:text-2xl font-black text-white hover:text-blue-400 transition-colors leading-tight"
                >
                  {slide.title}
                </Link>
              </div>

              {/* Center Match Scoreboard (Exact Polymarket Style) */}
              <div className="flex items-center gap-4 sm:gap-6 mx-auto sm:mx-0">
                {/* Team 1 (Dodgers) */}
                <div className="flex flex-col items-center">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-blue-500 tracking-tighter">
                    {slide.team1?.code || "LA"}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300">{slide.team1?.name || "Dodgers"}</span>
                </div>

                {/* Live Score & Status */}
                <div className="flex flex-col items-center">
                  <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider">
                    {slide.team1?.score ?? 7} <span className="text-slate-500">-</span> {slide.team2?.score ?? 5}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>{slide.liveStatus || "Live"}</span>
                    <Info className="h-3 w-3 text-slate-500 ml-0.5" />
                  </div>
                </div>

                {/* Team 2 (Rockies) */}
                <div className="flex flex-col items-center">
                  <span className="font-serif text-2xl sm:text-3xl font-black text-purple-400 tracking-tighter">
                    {slide.team2?.code || "CR"}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300">{slide.team2?.name || "Rockies"}</span>
                </div>
              </div>

              {/* Top Right Actions */}
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <button
                  type="button"
                  title="Share Market"
                  className="rounded-xl border border-white/[0.08] bg-[#0E1422] p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
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

            {/* Main Live Sports Layout: Betting Options Left (4/12) + Live Step-Line Chart Right (8/12) */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center">
              {/* Left Column: Team Tabs + Spread + Total */}
              <div className="sm:col-span-5 space-y-3">
                {/* 2 Big Winner Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTeamTab("team1")}
                    className={cn(
                      "rounded-xl py-2.5 text-center text-xs font-black transition-all cursor-pointer border",
                      activeTeamTab === "team1"
                        ? "border-blue-500/50 bg-blue-600/20 text-blue-400 shadow-md"
                        : "border-white/5 bg-[#101726]/80 text-slate-400 hover:text-white",
                    )}
                  >
                    Dodgers
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTeamTab("team2")}
                    className={cn(
                      "rounded-xl py-2.5 text-center text-xs font-black transition-all cursor-pointer border",
                      activeTeamTab === "team2"
                        ? "border-purple-500/50 bg-purple-600/20 text-purple-400 shadow-md"
                        : "border-white/5 bg-[#101726]/80 text-slate-400 hover:text-white",
                    )}
                  >
                    Rockies
                  </button>
                </div>

                {/* Spread Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="text-white">Spread</span>
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                      <span>‹</span>
                      <span>1.5</span>
                      <span className="text-white font-extrabold">2.5</span>
                      <span>3.5</span>
                      <span>›</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-white/5 bg-[#101726]/80 py-2 text-center text-xs font-bold text-slate-300 hover:border-blue-500/30 hover:bg-[#131D33] transition-all"
                    >
                      {slide.spread?.opt1}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/5 bg-[#101726]/80 py-2 text-center text-xs font-bold text-slate-300 hover:border-purple-500/30 hover:bg-[#131D33] transition-all"
                    >
                      {slide.spread?.opt2}
                    </button>
                  </div>
                </div>

                {/* Total Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="text-white">Total</span>
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                      <span>‹</span>
                      <span>1.5</span>
                      <span className="text-white font-extrabold">12.5</span>
                      <span>13.</span>
                      <span>›</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-white/5 bg-[#101726]/80 py-2 text-center text-xs font-bold text-slate-300 hover:border-blue-500/30 hover:bg-[#131D33] transition-all"
                    >
                      {slide.total?.opt1}
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-white/5 bg-[#101726]/80 py-2 text-center text-xs font-bold text-slate-300 hover:border-purple-500/30 hover:bg-[#131D33] transition-all"
                    >
                      {slide.total?.opt2}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Step-Line Chart (Matching Polymarket Screenshot 2) */}
              <div className="sm:col-span-7 flex flex-col justify-between pl-0 sm:pl-2">
                <div className="relative h-[160px] w-full">
                  <svg viewBox="0 0 360 160" className="h-full w-full overflow-visible">
                    {/* Dotted Grid Horizontal Lines (100%, 75%, 50%, 25%, 0%) */}
                    {[100, 75, 50, 25, 0].map((val) => {
                      const y = 145 - (val / 100) * 125;
                      return (
                        <g key={val}>
                          <line
                            x1="0"
                            y1={y}
                            x2="310"
                            y2={y}
                            stroke="#334155"
                            strokeWidth="0.8"
                            strokeDasharray="2 3"
                            className="opacity-40"
                          />
                          <text
                            x="318"
                            y={y + 3}
                            fill="#64748B"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="start"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Step-Line Curves (Team 1 Dodgers - Blue) */}
                    {(() => {
                      const pts1 = slide.historyTeam1!.map((val, i) => ({
                        x: (i / (slide.historyTeam1!.length - 1)) * 250,
                        y: 145 - (val / 100) * 125,
                      }));
                      const last1 = pts1[pts1.length - 1];

                      return (
                        <g>
                          <path
                            d={getStepPath(pts1)}
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Live Dot Node & Ping */}
                          <circle cx={last1.x} cy={last1.y} r="4" fill="#3B82F6" />
                          <circle cx={last1.x} cy={last1.y} r="8" fill="#3B82F6" opacity="0.3" className="animate-ping" />
                          {/* Floating Attached Label */}
                          <text x={last1.x + 8} y={last1.y - 4} fill="#3B82F6" fontSize="10" fontWeight="700">
                            Dodgers
                          </text>
                          <text x={last1.x + 8} y={last1.y + 12} fill="#3B82F6" fontSize="16" fontWeight="900" fontFamily="monospace">
                            95%
                          </text>
                        </g>
                      );
                    })()}

                    {/* Step-Line Curves (Team 2 Rockies - Purple) */}
                    {(() => {
                      const pts2 = slide.historyTeam2!.map((val, i) => ({
                        x: (i / (slide.historyTeam2!.length - 1)) * 250,
                        y: 145 - (val / 100) * 125,
                      }));
                      const last2 = pts2[pts2.length - 1];

                      return (
                        <g>
                          <path
                            d={getStepPath(pts2)}
                            fill="none"
                            stroke="#A855F7"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Live Dot Node & Ping */}
                          <circle cx={last2.x} cy={last2.y} r="4" fill="#A855F7" />
                          <circle cx={last2.x} cy={last2.y} r="8" fill="#A855F7" opacity="0.3" className="animate-ping" />
                          {/* Floating Attached Label */}
                          <text x={last2.x + 8} y={last2.y - 2} fill="#A855F7" fontSize="10" fontWeight="700">
                            Rockies
                          </text>
                          <text x={last2.x + 8} y={last2.y + 12} fill="#A855F7" fontSize="14" fontWeight="900" fontFamily="monospace">
                            6%
                          </text>
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Timestamps X Axis */}
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1 mt-1">
                  {slide.timestamps?.map((ts, i) => (
                    <span key={i}>{ts}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------ */
          /* SLIDE TYPE 2: Prediction Market Multi-Outcome Slide          */
          /* ------------------------------------------------------------ */
          <div>
            {/* Header: Avatar (54px) + Aligned Category & Title */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="h-[54px] w-[54px] rounded-xl object-cover shrink-0 bg-[#0E1422] border border-white/[0.08] shadow-sm"
                />
                <div className="flex flex-col justify-between min-h-[54px] min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-400">
                    {slide.tag} · RetroPick Consensus
                  </div>
                  <Link
                    to={`/markets/m/${slide.id}`}
                    className="font-display text-lg sm:text-xl font-bold text-white hover:text-blue-400 transition-colors leading-snug line-clamp-2"
                  >
                    {slide.title}
                  </Link>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 text-slate-400 shrink-0 pt-0.5">
                <button
                  type="button"
                  title="Share Market"
                  className="rounded-xl border border-white/[0.08] bg-[#0E1422] p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Share2 className="h-4 w-4" />
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

            {/* Main Content Area: Outcomes Left (5/12) + Synchronized Chart Right (7/12) */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center">
              {/* Left Outcomes Column */}
              <div className="sm:col-span-5 space-y-2">
                {slide.outcomes?.map((out, idx) => {
                  const isSelected = selectedOutcomeIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedOutcomeIdx(idx)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-xl border p-2 text-xs transition-all cursor-pointer text-left",
                        isSelected
                          ? "border-blue-500/50 bg-blue-600/15 shadow-md shadow-blue-600/10 font-bold"
                          : "border-white/[0.06] bg-[#0A0F1D]/80 hover:border-white/20 hover:bg-[#0E1424]",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: out.color }}
                        />
                        <span
                          className={cn(
                            "truncate font-semibold",
                            isSelected ? "text-white font-bold" : "text-slate-300",
                          )}
                        >
                          {out.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono font-black text-white">
                        <span>{out.percentage}%</span>
                      </div>
                    </button>
                  );
                })}

                {/* News Footer */}
                <div className="pt-1 text-[11px] text-slate-400">
                  <p className="line-clamp-1 font-medium text-slate-300">{slide.news}</p>
                  <div className="mt-1 flex items-center justify-between font-bold text-[10px] text-slate-400">
                    <span>{slide.newsSource}</span>
                    <span className="text-slate-200 font-mono">{slide.volume}</span>
                  </div>
                </div>
              </div>

              {/* Right Chart Column */}
              <div className="sm:col-span-7 flex flex-col justify-between pl-0 sm:pl-2">
                {/* Legend */}
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold">
                  {slide.outcomes?.map((out, idx) => {
                    const isSelected = selectedOutcomeIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedOutcomeIdx(idx)}
                        className={cn(
                          "flex items-center gap-1 transition-all cursor-pointer px-1 py-0.5 rounded",
                          isSelected ? "bg-white/10 opacity-100" : "opacity-70 hover:opacity-100",
                        )}
                        style={{ color: out.color }}
                      >
                        <span>●</span>
                        <span className="text-slate-300">{out.label}</span>
                        <span className="font-mono font-black">{out.percentage}%</span>
                      </button>
                    );
                  })}
                </div>

                {/* Multi-Line Spline Chart */}
                <div className="relative h-[150px] w-full">
                  <svg viewBox="0 0 360 150" className="h-full w-full overflow-visible">
                    {[100, 75, 50, 25, 0].map((val) => {
                      const y = 138 - (val / 100) * 120;
                      return (
                        <g key={val}>
                          <line
                            x1="0"
                            y1={y}
                            x2="320"
                            y2={y}
                            stroke="#1E293B"
                            strokeWidth="0.8"
                            strokeDasharray="3 3"
                            className="opacity-40"
                          />
                          <text
                            x="326"
                            y={y + 3}
                            fill="#64748B"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="start"
                          >
                            {val}%
                          </text>
                        </g>
                      );
                    })}

                    {slide.outcomes?.map((outcome, idx) => {
                      const isSelected = selectedOutcomeIdx === idx;
                      const history = outcome.history;
                      const pts = history.map((val, i) => ({
                        x: (i / (history.length - 1)) * 310,
                        y: 138 - (val / 100) * 120,
                      }));
                      const splinePath = getSplinePath(pts);
                      const lastPoint = pts[pts.length - 1];

                      return (
                        <g key={idx} onClick={() => setSelectedOutcomeIdx(idx)} className="cursor-pointer">
                          <path
                            d={splinePath}
                            fill="none"
                            stroke={outcome.color}
                            strokeWidth={isSelected ? "3" : "1.8"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={cn(
                              "transition-all duration-300",
                              isSelected
                                ? "opacity-100 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                : "opacity-60 hover:opacity-90",
                            )}
                          />
                          <circle
                            cx={lastPoint.x}
                            cy={lastPoint.y}
                            r={isSelected ? "4.5" : "3"}
                            fill={outcome.color}
                            stroke="#0E1422"
                            strokeWidth="1.5"
                          />
                          {isSelected && (
                            <circle
                              cx={lastPoint.x}
                              cy={lastPoint.y}
                              r="9"
                              fill={outcome.color}
                              opacity="0.3"
                              className="animate-ping"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Carousel Bottom Navigation Controls */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
          {/* Dot Indicators */}
          <div className="flex items-center gap-1.5">
            {FEATURED_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setCurrentSlide(idx);
                  setSelectedOutcomeIdx(0);
                }}
                title={`Go to slide ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  currentSlide === idx ? "w-6 bg-blue-500" : "w-1.5 bg-white/20 hover:bg-white/40",
                )}
              />
            ))}
          </div>

          {/* Volume and Prev/Next Navigation */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-400">
              {slide.volume}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                className="flex items-center gap-1 rounded-full border border-blue-500/20 bg-[#121B2F] px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-blue-600/20 hover:text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="hidden sm:inline">{slide.prevTopic}</span>
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="flex items-center gap-1 rounded-full border border-blue-500/20 bg-[#121B2F] px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:bg-blue-600/20 hover:text-white transition-all cursor-pointer"
              >
                <span className="hidden sm:inline">{slide.nextTopic}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT: Breaking News & Hot Topics Sidebar (Col 4 / 12)       */}
      {/* ============================================================ */}
      <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 sm:p-5 shadow-xl lg:col-span-4 transition-all">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Breaking News ›
            </span>
          </div>

          <div className="space-y-3">
            {BREAKING_NEWS.map((item, idx) => (
              <Link
                key={idx}
                to={`/markets/m/${item.id}`}
                className="group flex items-start justify-between gap-2.5 text-xs hover:bg-blue-600/10 p-1.5 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span className="font-mono text-slate-500 font-bold">{idx + 1}</span>
                  <span className="text-slate-200 group-hover:text-blue-400 font-semibold line-clamp-2 leading-snug">
                    {item.title}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <span className="font-mono font-black text-white text-xs">{item.prob}%</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold",
                      item.delta > 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {item.delta > 0 ? `↗ ${item.delta}%` : `↘ ${Math.abs(item.delta)}%`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-white/[0.06] pt-3.5">
          <div className="flex items-center justify-between mb-2.5 text-xs font-bold text-slate-400">
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
