import { useRef, type WheelEvent as ReactWheelEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAssetContext } from "@/context/AssetContext";
import WalletButton from "./WalletButton";
import Logo from "@/landing_components/Logo";
import { ModeToggle } from "./mode-toggle";

interface HeaderProps {
  discoveryNav?: {
    tabs: readonly string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    assetFilter: string;
    onAssetFilterChange: (value: string) => void;
  };
}

const Header = ({ discoveryNav }: HeaderProps) => {
  const location = useLocation();
  const { assets, selectedSymbol, setSelectedSymbol } = useAssetContext();
  const railRef = useRef<HTMLDivElement>(null);
  const isMarketsAllPage = location.pathname === "/app/markets/all";

  const navItems = [
    { name: "Discover", path: "/app/markets/all" },
    { name: "Up vs Down?", path: "/app/markets/updown", withSeparator: true },
    { name: "Above or Below?", path: "/app/markets/abovebelow" },
    { name: "Portfolio", path: "/app/portfolio" },
  ];

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    railRef.current.scrollLeft += delta;
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-border/60 bg-background/85 shadow-[0_14px_36px_-28px_rgba(5,12,30,0.45)] backdrop-blur-xl">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
            <div className="flex justify-start">
              <Link to="/app/markets/all" className="flex min-w-0 items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-transparent">
                  <Logo className="size-9" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">RetroPick</div>
                </div>
              </Link>
            </div>

            <nav className="flex items-center justify-center gap-2">
              {navItems.map((item) => {
                const isActive = item.path === "/app/markets/all"
                  ? isMarketsAllPage
                  : location.pathname === item.path;

                return (
                  <div key={item.path} className="flex items-center">
                    {item.withSeparator ? (
                      <span className="px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                        |
                      </span>
                    ) : null}
                    <Link
                      to={item.path}
                      className={cn(
                        "rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                        isActive
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {item.name}
                    </Link>
                  </div>
                );
              })}
            </nav>

            <div className="flex items-center justify-end gap-2">
              <div className="rounded-full border border-border/60 bg-background/75 shadow-sm backdrop-blur">
                <ModeToggle />
              </div>
              <WalletButton />
            </div>
          </div>

          <div className="border-t border-border/50 bg-gradient-to-r from-slate-100/85 via-white/75 to-slate-100/85 px-4 py-2 dark:from-slate-950/70 dark:via-slate-900/60 dark:to-slate-950/70">
            {isMarketsAllPage && discoveryNav ? (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="-mx-1 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-w-max items-center gap-2 px-1">
                  {discoveryNav.tabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => discoveryNav.onTabChange(tab)}
                      className={cn(
                        "shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                        discoveryNav.activeTab === tab
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                  <span className="shrink-0 px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                    |
                  </span>
                  <button
                    onClick={() => discoveryNav.onAssetFilterChange("All assets")}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors",
                      discoveryNav.assetFilter === "All assets"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-label="Show all discovery assets"
                  >
                    All Assets
                  </button>

                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => discoveryNav.onAssetFilterChange(asset.symbol)}
                      className={cn(
                        "grid min-w-[168px] shrink-0 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-all duration-200",
                        discoveryNav.assetFilter === asset.symbol
                          ? "border-slate-900/15 bg-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.28)] dark:border-white/15 dark:bg-slate-900"
                          : "border-white/60 bg-white/65 hover:border-slate-900/10 hover:bg-white/90 dark:border-white/8 dark:bg-slate-900/55 dark:hover:border-white/14 dark:hover:bg-slate-900/80",
                      )}
                      aria-label={`Filter discovery by ${asset.name}`}
                    >
                      <img
                        src={asset.image}
                        alt=""
                        className={cn(
                          "size-8 rounded-full object-contain ring-1",
                          discoveryNav.assetFilter === asset.symbol
                            ? "ring-slate-900/10 dark:ring-white/15"
                            : "ring-slate-900/5 dark:ring-white/10",
                        )}
                      />
                      <div className="min-w-0 text-sm font-semibold tracking-tight text-foreground tabular-nums">
                        ${asset.priceUsd.toLocaleString(undefined, { maximumFractionDigits: asset.priceUsd >= 100 ? 2 : 4 })}
                      </div>
                      <div
                        className={cn(
                          "min-w-[58px] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold whitespace-nowrap tabular-nums",
                          (asset.priceChangePct24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500",
                        )}
                      >
                        {(asset.priceChangePct24h ?? 0) >= 0 ? "+" : ""}
                        {(asset.priceChangePct24h ?? 0).toFixed(2)}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="-mx-1 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-w-max gap-2 px-1">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      className={cn(
                        "grid min-w-[168px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-all duration-200",
                        selectedSymbol === asset.symbol
                          ? "border-slate-900/15 bg-white shadow-[0_10px_18px_-16px_rgba(15,23,42,0.28)] dark:border-white/15 dark:bg-slate-900"
                          : "border-white/60 bg-white/65 hover:border-slate-900/10 hover:bg-white/90 dark:border-white/8 dark:bg-slate-900/55 dark:hover:border-white/14 dark:hover:bg-slate-900/80",
                      )}
                      aria-label={`Select ${asset.name}`}
                    >
                      <img
                        src={asset.image}
                        alt=""
                        className={cn(
                          "size-8 rounded-full object-contain ring-1",
                          selectedSymbol === asset.symbol
                            ? "ring-slate-900/10 dark:ring-white/15"
                            : "ring-slate-900/5 dark:ring-white/10",
                        )}
                      />
                      <div className="min-w-0 text-sm font-semibold tracking-tight text-foreground tabular-nums">
                        ${asset.priceUsd.toLocaleString(undefined, { maximumFractionDigits: asset.priceUsd >= 100 ? 2 : 4 })}
                      </div>
                      <div className={cn(
                        "min-w-[58px] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold whitespace-nowrap tabular-nums",
                        (asset.priceChangePct24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500",
                      )}>
                        {(asset.priceChangePct24h ?? 0) >= 0 ? "+" : ""}
                        {(asset.priceChangePct24h ?? 0).toFixed(2)}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
