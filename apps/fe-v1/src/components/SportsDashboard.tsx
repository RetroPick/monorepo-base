import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAllMarkets } from "@/context/AllMarketsContext";
import NeonMarketCard from "./NeonMarketCard";
import Icon from "./Icon";
import BetaTutorialBanner from "./BetaTutorialBanner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { fetchTrendingEvents } from "@/lib/polymarket";

const SportsDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { markets } = useAllMarkets();
  const [activeSport, setActiveSport] = useState("All");
  const [activeNewsIndex, setActiveNewsIndex] = useState(0);
  const [newsItems, setNewsItems] = useState<string[]>(["Loading live sports events..."]);
  const [visibleCount, setVisibleCount] = useState(10);

  const sportsCategories = [
    { name: "All", icon: "sports" },
    { name: "Basketball", icon: "sports_basketball" },
    { name: "Esports", icon: "sports_esports" },
    { name: "Soccer", icon: "sports_soccer" },
    { name: "MMA", icon: "sports_mma" },
    { name: "Tennis", icon: "sports_tennis" },
    { name: "American Football", icon: "sports_football" },
  ];

  const sportsMarkets = markets
    .filter((m) => m.category === "Sports" || m.category === "Esports")
    .filter((m) => {
      if (activeSport === "All") return true;
      if (activeSport === "Basketball") return m.title.includes("NBA") || m.title.includes("Basketball");
      if (activeSport === "Esports")
        return (
          m.title.includes("LoL") ||
          m.title.includes("Gaming") ||
          m.title.includes("Esports") ||
          m.title.includes("CS2") ||
          m.title.includes("Dota")
        );
      if (activeSport === "Soccer")
        return (
          m.title.includes("Premier League") ||
          m.title.includes("Soccer") ||
          m.title.includes("Champions League")
        );
      if (activeSport === "MMA") return m.title.includes("UFC") || m.title.includes("MMA");
      if (activeSport === "Tennis") return m.title.includes("Tennis");
      if (activeSport === "American Football") return m.title.includes("NFL");
      return true;
    });

  useEffect(() => {
    const loadLiveNews = async () => {
      const events = await fetchTrendingEvents(10, "Sports");
      if (events.length > 0) {
        setNewsItems(events.map((e) => e.title));
      } else {
        setNewsItems(["Live sports data unavailable..."]);
      }
    };

    loadLiveNews();

    const interval = setInterval(() => {
      setActiveNewsIndex((prev) => (prev + 1) % (newsItems.length || 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [newsItems.length]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen gap-6 p-6 bg-background relative overflow-hidden transition-colors duration-500">
      {/* Cyberpunk Grid Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-50 dark:opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/20 blur-[150px] rounded-full pointer-events-none transform-gpu" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/20 blur-[150px] rounded-full pointer-events-none transform-gpu" />

      {/* Sidebar */}
      <aside className="w-full lg:w-64 flex flex-col gap-2 z-10 shrink-0 mt-20 lg:mt-32">
        <div className="p-4 mb-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-md transition-colors duration-500">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            {t("categories.sports").toUpperCase()}
          </h2>
          <p className="text-xs text-slate-500 dark:text-blue-200/50 mt-1">
            {t("dashboard.live")} Markets
          </p>

          <div className="h-4 overflow-hidden relative mt-4">
            <p
              key={activeNewsIndex}
              className="text-[10px] text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap text-ellipsis"
            >
              {newsItems[activeNewsIndex]}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2">
          {sportsCategories.map((sport) => (
            <button
              key={sport.name}
              onClick={() => setActiveSport(sport.name)}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                activeSport === sport.name
                  ? "bg-gradient-to-r from-blue-100/80 to-transparent dark:from-blue-900/40 dark:to-transparent border-l-4 border-blue-500 text-blue-700 dark:text-white shadow-[0_0_20px_rgba(59,130,246,0.15)] dark:shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                  : "hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white border-l-4 border-transparent hover:border-slate-300 dark:hover:border-white/20"
              )}
            >
              <Icon
                name={sport.icon}
                className={cn(
                  "text-xl transition-colors",
                  activeSport === sport.name
                    ? "text-blue-600 dark:text-blue-400"
                    : "group-hover:text-slate-800 dark:group-hover:text-white"
                )}
              />
              <span className="font-medium tracking-wide">{sport.name}</span>

              {activeSport === sport.name && (
                <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 pointer-events-none animate-pulse-slow" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Grid */}
      <main className="flex-1 flex flex-col gap-6 z-10 content-start pb-20 mt-20 lg:mt-32">
        <BetaTutorialBanner className="w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sportsMarkets.slice(0, visibleCount).map((market) => (
            <div
              key={market.id}
              onClick={() => navigate(`/app/market/${market.id}`, { state: { market } })}
              className="cursor-pointer"
            >
              <NeonMarketCard market={market} />
            </div>
          ))}
        </div>

        {visibleCount < sportsMarkets.length && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setVisibleCount((prev) => prev + 10)}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all text-slate-500 dark:text-slate-300 hover:text-white"
            >
              Load More ({sportsMarkets.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default SportsDashboard;
