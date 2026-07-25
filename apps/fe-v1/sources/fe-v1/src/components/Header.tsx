import { lazy, Suspense, useRef, type WheelEvent as ReactWheelEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetContext } from "@/context/AssetContext";
import Logo from "@/components/Logo";
import { ModeToggle } from "./mode-toggle";
import type { AssetClass } from "@/lib/market-data/types";
import { ASSET_CLASS_OPTIONS, ASSET_CLASS_SUBTITLE } from "@/lib/market-data/asset-classes";
import type { DiscoveryVerticalId } from "@/lib/discovery-verticals";
import { DISCOVERY_VERTICALS } from "@/lib/discovery-verticals";

const WalletButton = lazy(() => import("./WalletButton"));

interface HeaderProps {
  discoveryNav?: {
    verticals: typeof DISCOVERY_VERTICALS;
    activeVerticalId: DiscoveryVerticalId;
    onVerticalChange: (id: DiscoveryVerticalId) => void;
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

const Header = ({ discoveryNav, assetClassNav, marketFamilyAssetClassNav }: HeaderProps) => {
  const location = useLocation();
  const { assets, selectedSymbol, setSelectedSymbol } = useAssetContext();
  const railRef = useRef<HTMLDivElement>(null);
  const isMarketsAllPage = location.pathname === "/app/markets/all";

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

  const primaryNav = (
    <>
      {navItems.map((item) => {
        const isActive = isNavItemActive(item);
        return (
          <div key={item.path} className="flex shrink-0 items-center">
            {"withSeparator" in item && item.withSeparator ? (
              <span className="hidden shrink-0 px-1.5 text-muted-foreground/35 select-none lg:inline" aria-hidden="true">
                ·
              </span>
            ) : null}
            <Link
              to={item.path}
                className={cn(
                "whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium transition-colors max-lg:rounded-md max-lg:px-3 max-lg:py-1.5 max-lg:text-[10px] max-lg:font-semibold max-lg:uppercase max-lg:tracking-[0.12em] sm:px-2.5 sm:py-1.5",
                isActive
                  ? "text-primary max-lg:border max-lg:border-primary/25 max-lg:bg-primary/15"
                  : "text-muted-foreground hover:text-foreground max-lg:border max-lg:border-transparent max-lg:hover:bg-muted",
              )}
            >
              {item.name}
            </Link>
          </div>
        );
      })}
    </>
  );

  return (
    <header className="sticky inset-x-0 top-0 z-50 shrink-0 border-b border-border/40 bg-background/90 backdrop-blur-md dark:border-white/[0.06] dark:bg-background/95">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
        <div className="flex min-h-11 flex-nowrap items-center gap-2 py-1.5 sm:min-h-12 sm:gap-3 sm:py-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
            <Link to="/app/markets/all" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-transparent sm:size-9">
                <Logo className="size-7 sm:size-8" />
              </div>
              <div className="min-w-0">
                <div className="whitespace-nowrap text-xs font-semibold tracking-tight text-foreground sm:text-sm">
                  RetroPick
                </div>
              </div>
            </Link>
          </div>

          <nav
            className="hidden min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto no-scrollbar lg:flex"
            aria-label="Main navigation"
          >
            {primaryNav}
          </nav>

          <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2">
            <div className="relative hidden w-[10rem] shrink-0 sm:w-[11.5rem] md:block">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Search markets..."
                readOnly
                aria-label="Search markets"
                className="h-8 w-full rounded-full border border-border bg-muted/40 py-0 pl-8 pr-2.5 text-xs leading-none text-foreground shadow-sm placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-card/90 dark:shadow-none sm:h-9 sm:pl-9 sm:pr-3"
              />
            </div>
            <div className="rounded-full border border-border/60 bg-background/75 shadow-sm backdrop-blur [&_button]:h-8 [&_button]:w-8 [&_button]:min-h-0 sm:[&_button]:h-9 sm:[&_button]:w-9">
              <ModeToggle />
            </div>
            <Suspense
              fallback={
                <div className="h-8 w-[118px] shrink-0 rounded-full border border-border/60 bg-background/75 shadow-sm backdrop-blur sm:h-9 sm:w-[124px]" />
              }
            >
              <WalletButton />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Viewport-wide strip so border + tint span edge-to-edge (not clipped by max-width). */}
      <div className="w-full min-w-0 border-t border-border/40 bg-muted/40 py-1.5 dark:border-white/[0.08] dark:bg-card/40">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <nav
            className="mb-1.5 w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain lg:mb-0 lg:hidden"
            aria-label="Main navigation"
          >
            <div className="flex min-w-max flex-nowrap items-center gap-1.5 sm:gap-2">{primaryNav}</div>
          </nav>

          <div className="min-w-0">
            {isMarketsAllPage && discoveryNav ? (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2">
                  {assetClassNav ? (
                    <>
                      {ASSET_CLASS_OPTIONS.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => assetClassNav.onClassChange(id)}
                          aria-pressed={assetClassNav.activeClass === id}
                          className={cn(
                            "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors sm:px-3 sm:py-1.5 sm:tracking-[0.14em]",
                            assetClassNav.activeClass === id
                              ? "border border-primary/25 bg-primary/15 text-primary"
                              : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
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
                  {discoveryNav.verticals.map((v) => {
                    const isActive = discoveryNav.activeVerticalId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => discoveryNav.onVerticalChange(v.id)}
                        aria-pressed={isActive}
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight transition-colors sm:px-3 sm:py-1.5",
                          isActive
                            ? "border border-primary/25 bg-primary/15 text-primary"
                            : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {v.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : marketFamilyAssetClassNav ? (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2">
                  {ASSET_CLASS_OPTIONS.map(({ id, label }) => (
                    <Link
                      key={id}
                      to={`${marketFamilyAssetClassNav.basePath}/${id}`}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors sm:px-3 sm:py-1.5 sm:tracking-[0.14em]",
                        marketFamilyAssetClassNav.activeClass === id
                          ? "border border-primary/25 bg-primary/15 text-primary"
                          : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
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
                          "grid min-h-9 min-w-[132px] shrink-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left transition-all duration-200 sm:min-w-[148px] sm:gap-2 sm:px-2 sm:py-1.5",
                          selectedSymbol === asset.symbol
                            ? "border-border bg-card shadow-[0_10px_18px_-16px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-slate-900"
                            : "border-border/50 bg-card/70 hover:border-border hover:bg-card dark:border-white/8 dark:bg-slate-900/55 dark:hover:border-white/14 dark:hover:bg-slate-900/80",
                        )}
                        aria-label={`Select ${asset.name}`}
                      >
                        <img
                          src={asset.image}
                          alt=""
                          className={cn(
                            "size-6 rounded-full object-contain ring-1 sm:size-7",
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
                            (asset.priceChangePct24h ?? 0) >= 0 ? "text-up" : "text-down",
                          )}
                        >
                          {(asset.priceChangePct24h ?? 0) >= 0 ? "+" : ""}
                          {(asset.priceChangePct24h ?? 0).toFixed(2)}%
                        </div>
                      </button>
                    ))
                  ) : (
                    <span className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:px-2.5 sm:py-1.5 sm:text-[11px] sm:tracking-[0.18em]">
                      Reference series
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div
                ref={railRef}
                onWheel={handleWheel}
                className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2">
                  {assets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedSymbol(asset.symbol)}
                      className={cn(
                        "grid min-h-9 min-w-[132px] shrink-0 grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg border px-1.5 py-1 text-left transition-all duration-200 sm:min-w-[148px] sm:gap-2 sm:px-2 sm:py-1.5",
                        selectedSymbol === asset.symbol
                          ? "border-border bg-card shadow-[0_10px_18px_-16px_rgba(15,23,42,0.12)] dark:border-white/15 dark:bg-slate-900"
                          : "border-border/50 bg-card/70 hover:border-border hover:bg-card dark:border-white/8 dark:bg-slate-900/55 dark:hover:border-white/14 dark:hover:bg-slate-900/80",
                      )}
                      aria-label={`Select ${asset.name}`}
                    >
                      <img
                        src={asset.image}
                        alt=""
                        className={cn(
                          "size-6 rounded-full object-contain ring-1 sm:size-7",
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
                        (asset.priceChangePct24h ?? 0) >= 0 ? "text-up" : "text-down",
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
