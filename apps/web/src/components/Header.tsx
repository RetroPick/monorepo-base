import { lazy, Suspense, useRef, type WheelEvent as ReactWheelEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAssetContext } from "@/context/AssetContext";
import Logo from "@/components/Logo";
import { ModeToggle } from "./mode-toggle";
import type { AssetClass } from "@/lib/market-data/types";
import { ASSET_CLASS_OPTIONS, ASSET_CLASS_SUBTITLE } from "@/lib/market-data/asset-classes";

const WalletButton = lazy(() => import("./WalletButton"));

interface HeaderProps {
  discoveryNav?: {
    tabs: readonly string[];
    activeTab: string;
    onTabChange: (tab: string) => void;
    assetFilter: string;
    onAssetFilterChange: (value: string) => void;
  };
  /** Discover page: asset-class toggles + subtitle before time-bucket tabs. */
  assetClassNav?: {
    activeClass: AssetClass;
    onClassChange: (assetClass: AssetClass) => void;
  };
  /** Up vs Down / Above or Below: URL-driven asset-class pills + subtitle; crypto chips only when class is crypto. */
  marketFamilyAssetClassNav?: {
    basePath: "/app/markets/updown" | "/app/markets/abovebelow";
    activeClass: AssetClass;
  };
}

/** Symbols that have threshold markets on Discover; avoids empty grid when rail coins (e.g. BNB) mismatch catalog. */
const DISCOVERY_ASSET_ORDER = ["BTC", "ETH", "SOL"] as const;

const Header = ({ discoveryNav, assetClassNav, marketFamilyAssetClassNav }: HeaderProps) => {
  const location = useLocation();
  const { assets, selectedSymbol, setSelectedSymbol } = useAssetContext();
  const railRef = useRef<HTMLDivElement>(null);
  const isMarketsAllPage = location.pathname === "/app/markets/all";

  const discoveryRailAssets = DISCOVERY_ASSET_ORDER.map((symbol) => assets.find((a) => a.symbol === symbol)).filter(
    (a): a is NonNullable<typeof a> => Boolean(a),
  );

  const navItems = [
    { name: "Discover", path: "/app/markets/all" },
    { name: "Up vs Down?", path: "/app/markets/updown/crypto", withSeparator: true, activePrefix: "/app/markets/updown" },
    { name: "Above or Below?", path: "/app/markets/abovebelow/crypto", activePrefix: "/app/markets/abovebelow" },
    { name: "Portfolio", path: "/app/portfolio" },
  ] as const;

  const isNavItemActive = (item: (typeof navItems)[number]) => {
    if ("activePrefix" in item && item.activePrefix) {
      return location.pathname.startsWith(item.activePrefix);
    }
    if (item.path === "/app/markets/all") return isMarketsAllPage;
    return location.pathname === item.path;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    railRef.current.scrollLeft += delta;
  };

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex min-h-12 flex-nowrap items-center justify-between gap-2 py-2 sm:min-h-14 sm:py-2.5">
          <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3">
            <Link to="/app/markets/all" className="flex min-w-0 shrink-0 items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-transparent sm:size-10">
                <Logo className="size-8 sm:size-9" />
              </div>
              <div className="min-w-0">
                <div className="whitespace-nowrap text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  RetroPick
                </div>
              </div>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 justify-center overflow-hidden lg:flex">
            <nav className="flex max-w-full flex-nowrap items-center justify-center gap-1.5 overflow-x-auto no-scrollbar sm:gap-2">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item);

                return (
                  <div key={item.path} className="flex shrink-0 items-center">
                    {"withSeparator" in item && item.withSeparator ? (
                      <span className="shrink-0 px-1 text-muted-foreground/60 select-none sm:px-2" aria-hidden="true">
                        |
                      </span>
                    ) : null}
                    <Link
                      to={item.path}
                      className={cn(
                        "whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3.5 sm:text-xs sm:tracking-[0.18em]",
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
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="rounded-full border border-border/60 bg-background/75 shadow-sm backdrop-blur [&_button]:h-9 [&_button]:w-9 [&_button]:min-h-0 sm:[&_button]:h-10 sm:[&_button]:w-10">
              <ModeToggle />
            </div>
            <Suspense
              fallback={
                <div className="h-9 w-[128px] shrink-0 rounded-full border border-border/60 bg-background/75 shadow-sm backdrop-blur sm:h-10 sm:w-[132px]" />
              }
            >
              <WalletButton />
            </Suspense>
          </div>
        </div>

        <div className="border-t border-border/50 py-1.5 lg:hidden">
          <nav className="-mx-1 overflow-x-auto no-scrollbar overscroll-contain px-1">
            <div className="flex min-w-max flex-nowrap items-center gap-1.5">
              {navItems.map((item) => {
                const isActive = isNavItemActive(item);

                return (
                  <div key={item.path} className="flex items-center">
                    {"withSeparator" in item && item.withSeparator ? (
                      <span className="px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                        |
                      </span>
                    ) : null}
                    <Link
                      to={item.path}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3.5 sm:text-xs sm:tracking-[0.18em]",
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
            </div>
          </nav>
        </div>

        <div className="border-t border-border/50 bg-gradient-to-r from-slate-100/85 via-white/75 to-slate-100/85 py-1 dark:from-slate-950/70 dark:via-slate-900/60 dark:to-slate-950/70">
            {isMarketsAllPage && discoveryNav ? (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="-mx-1 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-h-[44px] min-w-max flex-nowrap items-center gap-1.5 px-1">
                  {assetClassNav ? (
                    <>
                      {ASSET_CLASS_OPTIONS.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => assetClassNav.onClassChange(id)}
                          aria-pressed={assetClassNav.activeClass === id}
                          className={cn(
                            "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3 sm:tracking-[0.18em]",
                            assetClassNav.activeClass === id
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                      <span className="shrink-0 px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                        |
                      </span>
                      <span
                        className="shrink-0 whitespace-nowrap px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]"
                        title={ASSET_CLASS_SUBTITLE[assetClassNav.activeClass]}
                      >
                        {ASSET_CLASS_SUBTITLE[assetClassNav.activeClass]}
                      </span>
                      <span className="shrink-0 px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                        |
                      </span>
                    </>
                  ) : null}
                  {discoveryNav.tabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => discoveryNav.onTabChange(tab)}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3 sm:tracking-[0.18em]",
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
                      "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3 sm:tracking-[0.18em]",
                      discoveryNav.assetFilter === "All assets"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    aria-label="Show all discovery assets"
                  >
                    All Assets
                  </button>

                  {discoveryRailAssets.map((asset) => (
                    <button
                      key={asset.id}
                      onClick={() => discoveryNav.onAssetFilterChange(asset.symbol)}
                      className={cn(
                        "grid min-h-[40px] min-w-[148px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all duration-200 sm:min-w-[160px] sm:px-2.5",
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
                          "size-7 rounded-full object-contain ring-1",
                          discoveryNav.assetFilter === asset.symbol
                            ? "ring-slate-900/10 dark:ring-white/15"
                            : "ring-slate-900/5 dark:ring-white/10",
                        )}
                      />
                      <div className="min-w-0 whitespace-nowrap text-xs font-semibold tracking-tight text-foreground tabular-nums sm:text-sm">
                        ${asset.priceUsd.toLocaleString(undefined, { maximumFractionDigits: asset.priceUsd >= 100 ? 2 : 4 })}
                      </div>
                      <div
                        className={cn(
                          "min-w-[52px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold whitespace-nowrap tabular-nums sm:min-w-[58px] sm:text-[11px]",
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
            ) : marketFamilyAssetClassNav ? (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="-mx-1 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-h-[44px] min-w-max flex-nowrap items-center gap-1.5 px-1">
                  {ASSET_CLASS_OPTIONS.map(({ id, label }) => (
                    <Link
                      key={id}
                      to={`${marketFamilyAssetClassNav.basePath}/${id}`}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3 sm:tracking-[0.18em]",
                        marketFamilyAssetClassNav.activeClass === id
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      aria-current={marketFamilyAssetClassNav.activeClass === id ? "page" : undefined}
                    >
                      {label}
                    </Link>
                  ))}
                  <span className="shrink-0 px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                    |
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]"
                    title={ASSET_CLASS_SUBTITLE[marketFamilyAssetClassNav.activeClass]}
                  >
                    {ASSET_CLASS_SUBTITLE[marketFamilyAssetClassNav.activeClass]}
                  </span>
                  <span className="shrink-0 px-2 text-muted-foreground/60 select-none" aria-hidden="true">
                    |
                  </span>
                  {marketFamilyAssetClassNav.activeClass === "crypto" ? (
                    assets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setSelectedSymbol(asset.symbol)}
                        className={cn(
                          "grid min-h-[40px] min-w-[148px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all duration-200 sm:min-w-[160px] sm:px-2.5",
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
                            "size-7 rounded-full object-contain ring-1",
                            selectedSymbol === asset.symbol
                              ? "ring-slate-900/10 dark:ring-white/15"
                              : "ring-slate-900/5 dark:ring-white/10",
                          )}
                        />
                        <div className="min-w-0 whitespace-nowrap text-xs font-semibold tracking-tight text-foreground tabular-nums sm:text-sm">
                          ${asset.priceUsd.toLocaleString(undefined, { maximumFractionDigits: asset.priceUsd >= 100 ? 2 : 4 })}
                        </div>
                        <div
                          className={cn(
                            "min-w-[52px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold whitespace-nowrap tabular-nums sm:min-w-[58px] sm:text-[11px]",
                            (asset.priceChangePct24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500",
                          )}
                        >
                          {(asset.priceChangePct24h ?? 0) >= 0 ? "+" : ""}
                          {(asset.priceChangePct24h ?? 0).toFixed(2)}%
                        </div>
                      </button>
                    ))
                  ) : (
                    <span className="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-xl border border-transparent px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
                      Reference series
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="-mx-1 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-h-[44px] min-w-max flex-nowrap items-center gap-1.5 px-1">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      className={cn(
                        "grid min-h-[40px] min-w-[148px] shrink-0 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all duration-200 sm:min-w-[160px] sm:px-2.5",
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
                          "size-7 rounded-full object-contain ring-1",
                          selectedSymbol === asset.symbol
                            ? "ring-slate-900/10 dark:ring-white/15"
                            : "ring-slate-900/5 dark:ring-white/10",
                        )}
                      />
                      <div className="min-w-0 whitespace-nowrap text-xs font-semibold tracking-tight text-foreground tabular-nums sm:text-sm">
                        ${asset.priceUsd.toLocaleString(undefined, { maximumFractionDigits: asset.priceUsd >= 100 ? 2 : 4 })}
                      </div>
                      <div className={cn(
                        "min-w-[52px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold whitespace-nowrap tabular-nums sm:min-w-[58px] sm:text-[11px]",
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
    </header>
  );
};

export default Header;
