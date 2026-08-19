import { useState, useRef, useEffect } from "react";
import {
  Flame,
  Star,
  Zap,
  Clock,
  ArrowUpDown,
  CircleDot,
  SlidersHorizontal,
  ListChecks,
  BarChart3,
  Gauge,
  Calendar,
  GitMerge,
  Coins,
  Landmark,
  DollarSign,
  Trophy,
  Cpu,
  Bot,
  Leaf,
  Vote,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface PolymarketCategoryBarProps {
  activeSort: string;
  onSelectSort: (sort: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  activeMarketType: string;
  onSelectMarketType: (type: string) => void;
}

// 1. Activity / Sort Options (Top Bar Left)
export const SORT_TABS = [
  { id: "trending", label: "Trending", icon: Flame, iconColor: "text-blue-400" },
  { id: "new", label: "New", icon: Star, iconColor: "text-slate-400" },
  { id: "active", label: "Most Active", icon: Zap, iconColor: "text-amber-400" },
  { id: "ending", label: "Ending Soon", icon: Clock, iconColor: "text-slate-400" },
];

// 2. Topic Categories with colorful themed icons (Non-political)
export const TOPIC_CATEGORIES = [
  { id: "crypto", label: "Crypto", icon: Coins, iconColor: "text-amber-400" },
  { id: "economics", label: "Economics", icon: Landmark, iconColor: "text-blue-400" },
  { id: "financials", label: "Financials", icon: DollarSign, iconColor: "text-teal-400" },
  { id: "sports", label: "Sports", icon: Trophy, iconColor: "text-rose-400" },
  { id: "tech_science", label: "Tech & Science", icon: Cpu, iconColor: "text-cyan-400" },
  { id: "ai", label: "AI", icon: Bot, iconColor: "text-yellow-400" },
  { id: "climate", label: "Climate", icon: Leaf, iconColor: "text-emerald-400" },
];

// 3. Market Types / Mechanisms (Bottom Bar)
export const MARKET_TYPES = [
  { id: "all", label: "All Types", icon: null, iconColor: "" },
  { id: "direction", label: "Direction", icon: ArrowUpDown, iconColor: "text-emerald-400" },
  { id: "threshold", label: "Threshold", icon: CircleDot, iconColor: "text-cyan-400" },
  { id: "range", label: "Range", icon: SlidersHorizontal, iconColor: "text-blue-400" },
  { id: "ladder", label: "Ladder", icon: BarChart3, iconColor: "text-amber-400" },
  { id: "velocity", label: "Velocity", icon: Gauge, iconColor: "text-orange-400" },
  { id: "date", label: "Date", icon: Calendar, iconColor: "text-slate-300" },
  { id: "multiple_choice", label: "Multiple Choice", icon: ListChecks, iconColor: "text-indigo-400" },
  { id: "convergence", label: "Convergence", icon: GitMerge, iconColor: "text-purple-400" },
];

export function PolymarketCategoryBar({
  activeSort,
  onSelectSort,
  activeCategory,
  onSelectCategory,
  activeMarketType,
  onSelectMarketType,
}: PolymarketCategoryBarProps) {
  const [showInfo, setShowInfo] = useState(false);

  const tier1Ref = useRef<HTMLDivElement>(null);
  const [tier1CanScrollLeft, setTier1CanScrollLeft] = useState(false);
  const [tier1CanScrollRight, setTier1CanScrollRight] = useState(false);

  const tier2Ref = useRef<HTMLDivElement>(null);
  const [tier2CanScrollLeft, setTier2CanScrollLeft] = useState(false);
  const [tier2CanScrollRight, setTier2CanScrollRight] = useState(false);

  const checkTier1Scroll = () => {
    const el = tier1Ref.current;
    if (!el) return;
    setTier1CanScrollLeft(el.scrollLeft > 6);
    setTier1CanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  const checkTier2Scroll = () => {
    const el = tier2Ref.current;
    if (!el) return;
    setTier2CanScrollLeft(el.scrollLeft > 6);
    setTier2CanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  };

  useEffect(() => {
    checkTier1Scroll();
    checkTier2Scroll();
    const handleResize = () => {
      checkTier1Scroll();
      checkTier2Scroll();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollTier1 = (direction: "left" | "right") => {
    if (!tier1Ref.current) return;
    const offset = direction === "left" ? -280 : 280;
    tier1Ref.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const scrollTier2 = (direction: "left" | "right") => {
    if (!tier2Ref.current) return;
    const offset = direction === "left" ? -280 : 280;
    tier2Ref.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const isTopicActive = (id: string) =>
    activeCategory === id ||
    (id === "economics" && activeCategory === "economy") ||
    (id === "tech_science" && (activeCategory === "tech" || activeCategory === "science"));

  return (
    <div className="mb-4 space-y-2 w-full select-none">
      {/* ============================================================ */}
      {/* TIER 1: Activity / Sort Pills + Categories                   */}
      {/* ============================================================ */}
      <div className="relative group/tier1 w-full">
        {/* Left Fade + Arrow */}
        {tier1CanScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-8 pl-0.5 bg-gradient-to-r from-background via-background/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollTier1("left")}
              className="text-slate-400 hover:text-white hover:scale-110 transition-all cursor-pointer p-0.5 pointer-events-auto"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scroll Container */}
        <div
          ref={tier1Ref}
          onScroll={checkTier1Scroll}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth py-1"
        >
          {/* Sort Tabs */}
          {SORT_TABS.map((sort) => {
            const Icon = sort.icon;
            const active = activeSort === sort.id;

            return (
              <button
                key={sort.id}
                type="button"
                onClick={() => onSelectSort(sort.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0",
                  active
                    ? "bg-[#192748] text-white font-bold shadow-md shadow-blue-600/25"
                    : "text-slate-400 font-semibold hover:text-white",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active ? "text-blue-400" : sort.iconColor)} />
                <span>{sort.label}</span>
              </button>
            );
          })}

          {/* Space / Vertical Divider between Sort and Categories */}
          <div className="h-3.5 w-[1px] bg-white/10 mx-1 shrink-0" />

          {/* Topic Categories */}
          {TOPIC_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = isTopicActive(cat.id);

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(active ? "all" : cat.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0",
                  active
                    ? "bg-[#192748] text-white font-bold shadow-md shadow-blue-600/25"
                    : "text-slate-400 font-semibold hover:text-white",
                )}
              >
                {Icon ? <Icon className={cn("h-3.5 w-3.5", cat.iconColor)} /> : null}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Fade + Arrow */}
        {tier1CanScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-8 pr-0.5 bg-gradient-to-l from-background via-background/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollTier1("right")}
              className="text-slate-400 hover:text-white hover:scale-110 transition-all cursor-pointer p-0.5 pointer-events-auto"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* TIER 2: Market Types Pills                                   */}
      {/* ============================================================ */}
      <div className="relative group/tier2 w-full">
        {/* Left Fade + Arrow */}
        {tier2CanScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-8 pl-0.5 bg-gradient-to-r from-background via-background/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollTier2("left")}
              className="text-slate-400 hover:text-white hover:scale-110 transition-all cursor-pointer p-0.5 pointer-events-auto"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scroll Container */}
        <div
          ref={tier2Ref}
          onScroll={checkTier2Scroll}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth py-0.5"
        >
          {/* Market Type Pills (Without Market Type label) */}
          {MARKET_TYPES.map((type) => {
            const Icon = type.icon;
            const active = activeMarketType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onSelectMarketType(type.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-all cursor-pointer whitespace-nowrap shrink-0",
                  active
                    ? "bg-[#192748] text-blue-300 font-bold shadow-md shadow-blue-600/25"
                    : "text-slate-400 font-semibold hover:text-white",
                )}
              >
                {Icon ? <Icon className={cn("h-3.5 w-3.5", type.iconColor)} /> : null}
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Fade + Arrow */}
        {tier2CanScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-8 pr-0.5 bg-gradient-to-l from-background via-background/90 to-transparent pointer-events-none">
            <button
              type="button"
              onClick={() => scrollTier2("right")}
              className="text-slate-400 hover:text-white hover:scale-110 transition-all cursor-pointer p-0.5 pointer-events-auto"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PolymarketCategoryBar;

