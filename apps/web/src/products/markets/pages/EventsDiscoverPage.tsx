import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bookmark, Search, SlidersHorizontal } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { DataStateEmpty, StaleBanner } from "../components/DataState";
import { TradeFutureHero } from "../components/discover/TradeFutureHero";
import { PolymarketCategoryBar } from "../components/discover/PolymarketCategoryBar";
import { EventCard } from "../components/EventCard";
import { EventCardSkeleton } from "../components/EventCardSkeleton";
import { FreshnessBadge } from "../components/FreshnessBadge";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { useMarketsEventsInfinite } from "../hooks/useMarketsQueries";
import { derivedVolumeNumeric } from "../lib/cardStats";
import { isDegradedFreshness } from "../lib/freshness";

const GRID_CLASS =
  "grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4";

const CATEGORY_KEYWORD_MAP: Record<string, string[]> = {
  // Topic Categories
  crypto: ["btc", "eth", "sol", "crypto", "bitcoin", "ethereum", "solana", "l2", "base", "arbitrum", "dex", "defi"],
  economics: ["fed", "rate", "cpi", "inflation", "gdp", "recession", "interest", "economy", "economics", "jobs", "blockade", "iran"],
  financials: ["ipo", "stock", "nvda", "nvidia", "apple", "meta", "s&p", "nasdaq", "banking", "treasury", "gold", "finance", "stocks"],
  sports: [
    "sports",
    "tennis",
    "atp",
    "wta",
    "swiatek",
    "sakkari",
    "tirante",
    "landaluce",
    "blockx",
    "cobolli",
    "real madrid",
    "man city",
    "enzo",
    "chelsea",
    "world cup",
    "football",
    "soccer",
    "f1",
    "verstappen",
    "nba",
    "ufc",
  ],
  tech_science: ["tech", "spacex", "starship", "apple", "m5", "chips", "semiconductor", "ev", "tesla", "byd", "science", "fusion"],
  ai: ["ai", "anthropic", "openai", "gpt", "gemini", "claude", "grok", "deepseek", "llm", "intelligence", "nvidia"],
  climate: ["climate", "green energy", "carbon", "weather", "temperature", "emission", "solar", "hurricane", "environment"],
  culture: ["culture", "movie", "music", "entertainment", "oscar", "grammy"],
  geopolitics: ["geopolitics", "hormuz", "traffic", "trade", "blockade", "iran", "war", "election"],
  space: ["space", "spacex", "starship", "booster", "mars", "moon", "nasa"],
  gaming: ["game", "esports", "cs2", "lol", "t1", "geng", "natus", "heretics"],
};

export function EventsDiscoverPage() {
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [activeSort, setActiveSort] = useState<string>("trending");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeMarketType, setActiveMarketType] = useState<string>("all");

  const events = useMarketsEventsInfinite();
  const allEvents = events.data?.pages.flatMap((p) => p.events) ?? [];
  const listFreshness = events.data?.pages[0]?.freshness;

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    let filtered = query
      ? allEvents.filter((e) => e.title.toLowerCase().includes(query))
      : [...allEvents];

    // 1. Filter by Market Mechanism / Type if not "all"
    if (activeMarketType !== "all") {
      switch (activeMarketType) {
        case "direction":
          filtered = filtered.filter(
            (e: any) =>
              e.cardType === "vs_match" ||
              e.rawMarket?.marketType === "DIRECTION" ||
              (e.title && (e.title.toLowerCase().includes("up or down") || e.title.toLowerCase().includes(" vs ") || e.title.toLowerCase().includes("5m"))),
          );
          break;

        case "threshold":
          filtered = filtered.filter(
            (e: any) =>
              e.rawMarket?.marketType === "THRESHOLD" ||
              (e.title &&
                (/\b(hit|\$|\%|reach|exceed|above|below|target|bps)\b/i.test(e.title) ||
                  (e.rawMarket?.question && /\b(hit|\$|\%|reach|exceed|bps)\b/i.test(e.rawMarket.question)))),
          );
          break;

        case "range":
          filtered = filtered.filter(
            (e: any) =>
              e.rawMarket?.marketType === "RANGE" ||
              (e.title && /\b(between|range|bps|ladder|spread|points|tier|where will)\b/i.test(e.title)),
          );
          break;

        case "multiple_choice":
          filtered = filtered.filter(
            (e: any) =>
              e.cardType === "multichoice" ||
              (e.options && e.options.length > 2) ||
              e.rawMarket?.marketType === "MULTIPLE_CHOICE",
          );
          break;

        case "ladder":
          filtered = filtered.filter(
            (e: any) =>
              e.rawMarket?.marketType === "LADDER" ||
              (e.title && /\b(ladder|rank|tier|bps|decision|stage)\b/i.test(e.title)),
          );
          break;

        case "velocity":
          filtered = filtered.filter(
            (e: any) =>
              e.rawMarket?.marketType === "VELOCITY" ||
              (e.title && /\b(first|fastest|reach 100m|speed|velocity|time)\b/i.test(e.title)),
          );
          break;

        case "date":
          filtered = filtered.filter(
            (e: any) =>
              e.rawMarket?.marketType === "DATE" ||
              (e.title && /\b(by|before|end of|september|july|december|2025|2026|2027|when|date)\b/i.test(e.title)),
          );
          break;

        case "convergence":
          filtered = filtered.filter(
            (e: any) =>
              e.rawMarket?.marketType === "CONVERGENCE" ||
              (e.title && /\b(convergence|which|reach 100m|deliver most)\b/i.test(e.title)),
          );
          break;
      }
    }

    // 2. Filter by Topic Category if not "all"
    if (activeCategory !== "all") {
      const keywords = CATEGORY_KEYWORD_MAP[activeCategory] ?? [activeCategory];
      filtered = filtered.filter((e: any) => {
        const catLower = (e.category ?? "").toLowerCase();
        if (
          catLower === activeCategory ||
          (activeCategory === "economics" && (catLower === "economy" || catLower === "finance")) ||
          (activeCategory === "financials" && (catLower === "finance" || catLower === "economics")) ||
          (activeCategory === "sports" && (catLower === "sports" || catLower === "football" || catLower === "soccer")) ||
          (activeCategory === "tech_science" && (catLower === "tech" || catLower === "science"))
        ) {
          return true;
        }
        const tagsLower = (e.tags ?? []).map((t: string) => t.toLowerCase());
        if (tagsLower.some((t: string) => t.includes(activeCategory))) {
          return true;
        }
        const titleLower = e.title.toLowerCase();
        const slugLower = (e.slug ?? "").toLowerCase();
        return keywords.some((kw) => titleLower.includes(kw) || slugLower.includes(kw));
      });
    }

    // 3. Sort by selected Sort Option
    switch (activeSort) {
      case "active":
      case "volume":
      case "trending":
        return filtered.sort((a, b) => derivedVolumeNumeric(b.id) - derivedVolumeNumeric(a.id));
      case "new":
        return filtered.sort(
          (a, b) => new Date(b.startAt ?? 0).getTime() - new Date(a.startAt ?? 0).getTime(),
        );
      case "ending":
        return filtered.sort(
          (a, b) =>
            (a.endAt ? new Date(a.endAt).getTime() : Number.MAX_SAFE_INTEGER) -
            (b.endAt ? new Date(b.endAt).getTime() : Number.MAX_SAFE_INTEGER),
        );
      default:
        return filtered;
    }
  }, [allEvents, search, activeSort, activeCategory, activeMarketType]);

  const searchActive = search.trim().length > 0;

  return (
    <MarketsAppShell
      title="RetroPick Markets"
      onSearchChange={(q) => setSearch(q)}
      activeCategory={activeCategory}
      onSelectCategory={(cat) => setActiveCategory(cat)}
    >
      {/* 1. Live Trending Market Carousel Hero Banner Section */}
      <TradeFutureHero
        onExploreClick={() => {
          const el = document.getElementById("markets-catalog-section");
          el?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {/* 2. All Markets Header Row with Search, Filter & Bookmark Actions (matching Screenshot 1) */}
      <div id="markets-catalog-section" className="mb-3 flex items-center justify-between pt-1">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
          All markets
        </h2>

        <div className="flex items-center gap-1.5 text-slate-400">
          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => setShowInlineSearch(!showInlineSearch)}
            title="Search markets"
            className={cn(
              "rounded-xl p-2 transition-colors cursor-pointer",
              showInlineSearch
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                : "hover:bg-white/10 hover:text-white",
            )}
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Filter Options Trigger */}
          <button
            type="button"
            onClick={() => {
              // Toggles sort between trending and most active
              setActiveSort((prev) => (prev === "trending" ? "active" : "trending"));
            }}
            title="Filter options"
            className="rounded-xl p-2 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>

          {/* Bookmark Trigger */}
          <button
            type="button"
            onClick={() => setFilterBookmarked(!filterBookmarked)}
            title="Bookmarks"
            className={cn(
              "rounded-xl p-2 transition-colors cursor-pointer",
              filterBookmarked
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "hover:bg-white/10 hover:text-white",
            )}
          >
            <Bookmark className={cn("h-4 w-4", filterBookmarked ? "fill-amber-400 text-amber-400" : "")} />
          </button>
        </div>
      </div>

      {/* Quick Search Input (if active) */}
      {showInlineSearch && (
        <div className="mb-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all markets..."
            autoFocus
            className="w-full rounded-xl border border-white/15 bg-[#0A0E1A] py-2 px-3.5 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
          />
        </div>
      )}

      {/* 3. Category & Market Type Navigation Bar */}
      <PolymarketCategoryBar
        activeSort={activeSort}
        onSelectSort={(s) => setActiveSort(s)}
        activeCategory={activeCategory}
        onSelectCategory={(cat) => setActiveCategory(cat)}
        activeMarketType={activeMarketType}
        onSelectMarketType={(t) => setActiveMarketType(t)}
      />

      <div id="markets-catalog-section" />

      {listFreshness && isDegradedFreshness(listFreshness) ? <StaleBanner /> : null}

      {/* Loading Skeletons */}
      {events.isLoading ? (
        <div className={cn(GRID_CLASS)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))}
        </div>
      ) : null}

      {/* Main Events Display */}
      {!events.isLoading ? (
        visibleEvents.length === 0 ? (
          <DataStateEmpty
            title={searchActive ? "No markets match your search" : "No events currently available"}
            description={
              searchActive
                ? "Try a different keyword or clear the search."
                : "The catalog is empty."
            }
          />
        ) : (
          /* Polymarket Card Grid */
          <div className={cn(GRID_CLASS)}>
            {visibleEvents.map((event) => (
              <div key={event.id} className="min-h-0 w-full self-stretch">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* Load More Button */}
      {events.hasNextPage ? (
        <button
          type="button"
          className="mt-8 w-full rounded-xl border border-white/10 bg-[#090D18] py-3 text-sm font-bold text-white transition-all hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-200 cursor-pointer"
          disabled={events.isFetchingNextPage}
          onClick={() => events.fetchNextPage()}
        >
          {events.isFetchingNextPage ? "Loading…" : "Load More Prediction Events"}
        </button>
      ) : null}
    </MarketsAppShell>
  );
}

export default EventsDiscoverPage;
