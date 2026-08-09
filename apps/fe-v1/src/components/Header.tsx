import { lazy, Suspense, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { openAppKitModal } from "@/lib/openAppKitModal";
import { useAssetContext } from "@/context/AssetContext";
import Logo from "@/components/Logo";

const HowRetroPickWorksDialog = lazy(() => import("@/components/HowRetroPickWorksDialog"));
import type { AssetClass } from "@/lib/market-data/types";
import { ASSET_CLASS_OPTIONS, ASSET_CLASS_SUBTITLE } from "@/lib/market-data/asset-classes";
import type { DiscoveryVerticalId } from "@/lib/discovery-verticals";
import { DISCOVERY_VERTICALS, discoveryVerticalFromSearchParam } from "@/lib/discovery-verticals";
import { discoverVerticalForIndexedSlug, marketTypeName } from "@/lib/market-data/chainDiscover";
const WalletButton = lazy(() => import("./WalletButton"));

interface HeaderProps {
  /** Drop the sticky header bottom rule so dense body content (manual market headline) blends with page bg. */
  omitBottomDivider?: boolean;
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
  /** Indexed on-chain market detail: category / market-type strip (not crypto price tickers). */
  indexedMarketContext?: {
    slug: string;
    marketType: number;
  };
  /**
   * Portfolio: same strip as Discover; drives `?vertical=` via parent `setSearchParams` so category
   * distribution stays in sync (buttons, not inert links).
   */
  portfolioDiscoverNav?: {
    verticals: typeof DISCOVERY_VERTICALS;
    activeVerticalId: DiscoveryVerticalId;
    onVerticalChange: (id: DiscoveryVerticalId) => void;
  };
}

const Header = ({
  omitBottomDivider,
  discoveryNav,
  assetClassNav,
  marketFamilyAssetClassNav,
  indexedMarketContext,
  portfolioDiscoverNav,
}: HeaderProps) => {
  const { isConnected } = useAccount();
  const location = useLocation();
  const [headerSearchParams] = useSearchParams();
  const { assets, selectedSymbol, setSelectedSymbol } = useAssetContext();
  const railRef = useRef<HTMLDivElement>(null);
  const [howRetroPickOpen, setHowRetroPickOpen] = useState(false);
  const howRetroPickHasOpenedRef = useRef(false);
  if (howRetroPickOpen) {
    howRetroPickHasOpenedRef.current = true;
  }
  const howRetroPickHasOpened = howRetroPickHasOpenedRef.current;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathNorm = location.pathname.replace(/\/+$/, "") || "/";
  const isMarketsAllPage = pathNorm === "/app/markets/all";
  const isMarketsShellRoute =
    pathNorm === "/app/markets/all" || pathNorm.startsWith("/app/markets/");
  const isPortfolioPage = pathNorm === "/app/portfolio";

  const navItems = [
    { name: "Markets", path: "/app/markets/all" },
    { name: "Portfolio", path: "/app/portfolio" },
  ] as const;

  const isNavItemActive = (item: (typeof navItems)[number]) => {
    const activePrefix = "activePrefix" in item ? (item as { activePrefix?: string }).activePrefix : undefined;
    if (typeof activePrefix === "string" && activePrefix.length > 0) {
      return location.pathname.startsWith(activePrefix);
    }
    if (item.path === "/app/markets/all") return isMarketsAllPage;
    return location.pathname === item.path;
  };

  /**
   * Translate vertical wheel delta into horizontal scroll on the rail. React
   * already attaches wheel listeners as passive in React 17+, so calling
   * `preventDefault()` would emit a console warning and have no effect — we
   * just nudge `scrollLeft`. The page may still scroll vertically; that's the
   * accepted trade-off for keeping the listener passive.
   */
  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
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
    <header
      id="app-site-header"
      className={cn(
        "sticky inset-x-0 top-0 z-50 shrink-0 bg-background/90 backdrop-blur-md dark:bg-background/95",
        omitBottomDivider
          ? "border-b-0"
          : "border-b border-border/40 dark:border-white/[0.06]",
      )}
    >
      <div className="mx-auto max-w-screen-2xl px-5 sm:px-8">
        <div className="flex min-h-11 flex-nowrap items-center gap-2 py-1.5 sm:min-h-12 sm:gap-3 sm:py-2">
          <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2.5">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/75 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                  aria-label="Open main menu"
                >
                  <Menu className="size-4" aria-hidden />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(20rem,80vw)] flex flex-col gap-6 px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]"
              >
                <Link
                  to="/app/markets/all"
                  className="flex items-center gap-2"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <div className="flex size-8 items-center justify-center rounded-lg">
                    <Logo className="size-7" />
                  </div>
                  <div className="text-sm font-semibold tracking-tight text-foreground">
                    RetroPick
                  </div>
                </Link>
                <nav className="flex flex-col gap-1" aria-label="Main navigation (mobile)">
                  {navItems.map((item) => {
                    const isActive = isNavItemActive(item);
                    return (
                      <SheetClose asChild key={item.path}>
                        <Link
                          to={item.path}
                          className={cn(
                            "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/15 text-primary"
                              : "text-foreground/85 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {item.name}
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
                <div className="mt-auto flex flex-col gap-2">
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={() => setHowRetroPickOpen(true)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-border/60 bg-background/75 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      How RetroPick works
                    </button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

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
            <button
              type="button"
              onClick={() => setHowRetroPickOpen(true)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border/60 bg-background/75 px-3 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:px-3.5 sm:text-sm",
              )}
              aria-label="How RetroPick works"
              title="How RetroPick works"
            >
              How?
            </button>
            {!isMarketsShellRoute &&
              (!isConnected ? (
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void openAppKitModal()}
                    className="h-8 shrink-0 rounded-lg border border-zinc-600/85 bg-zinc-700 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 sm:h-9 sm:px-4 sm:text-sm"
                  >
                    Sign In
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => void openAppKitModal()}
                    className="h-8 shrink-0 rounded-lg border border-blue-600/90 bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500 sm:h-9 sm:px-4 sm:text-sm"
                  >
                    Sign Up
                  </Button>
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="h-8 min-w-[10rem] shrink-0 rounded-full border border-border/60 bg-background/75 shadow-sm backdrop-blur sm:h-9" />
                  }
                >
                  <WalletButton />
                </Suspense>
              ))}
          </div>
        </div>
      </div>

      {/* Viewport-wide strip so border + tint span edge-to-edge (not clipped by max-width). */}
      <div className="w-full min-w-0 border-t border-border/40 bg-muted/40 py-1.5 dark:border-white/[0.08] dark:bg-card/40">
        <div className="mx-auto max-w-screen-2xl px-5 sm:px-8">
          <div className="min-w-0">
            {(() => {
              const assetPriceLowerRail = (
                <div
                  ref={railRef}
                  onWheel={handleWheel}
                  className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <div
                    className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2"
                    aria-label="Crypto reference prices"
                  >
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
                          width={28}
                          height={28}
                          loading="lazy"
                          decoding="async"
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
                    ))}
                  </div>
                </div>
              );

              if (indexedMarketContext) {
                const vertical = discoverVerticalForIndexedSlug(
                  indexedMarketContext.slug,
                  indexedMarketContext.marketType,
                );
                const typeLabel = marketTypeName(indexedMarketContext.marketType);
                return (
                  <div
                    ref={railRef}
                    onWheel={handleWheel}
                    className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div
                      className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2"
                      aria-label="Market category"
                    >
                      <span
                        className="shrink-0 whitespace-nowrap rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary sm:px-2.5 sm:py-1.5"
                        title="Contract market type"
                      >
                        {typeLabel}
                      </span>
                      <span className="shrink-0 px-1 text-muted-foreground/45 select-none" aria-hidden="true">
                        |
                      </span>
                      {DISCOVERY_VERTICALS.map((v) => (
                        <Link
                          key={v.id}
                          to="/app/markets/all"
                          state={{ discoverVertical: v.id }}
                          className={cn(
                            "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight transition-colors sm:px-3 sm:py-1.5",
                            v.id === vertical
                              ? "border border-primary/25 bg-primary/15 text-primary"
                              : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {v.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              if (isMarketsAllPage && discoveryNav) {
                return (
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
                );
              }

              if (marketFamilyAssetClassNav) {
                return (
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
                          width={28}
                          height={28}
                          loading="lazy"
                          decoding="async"
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
                );
              }

              if (portfolioDiscoverNav) {
                return (
                  <div
                    ref={railRef}
                    onWheel={handleWheel}
                    className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div
                      className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2"
                      aria-label="Discover categories"
                    >
                      {portfolioDiscoverNav.verticals.map((v) => {
                        const isActive = v.id === portfolioDiscoverNav.activeVerticalId;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => portfolioDiscoverNav.onVerticalChange(v.id)}
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
                );
              }

              if (isPortfolioPage) {
                const portfolioStripActiveId = discoveryVerticalFromSearchParam(headerSearchParams.get("vertical"));
                const portfolioVerticalHref = (id: (typeof DISCOVERY_VERTICALS)[number]["id"]) => {
                  const p = new URLSearchParams(headerSearchParams);
                  if (id === "trending") p.delete("vertical");
                  else p.set("vertical", id);
                  const qs = p.toString();
                  return qs.length > 0 ? `/app/portfolio?${qs}` : "/app/portfolio";
                };
                return (
                  <div
                    ref={railRef}
                    onWheel={handleWheel}
                    className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div
                      className="flex min-h-10 min-w-max flex-nowrap items-center gap-2 px-0 sm:gap-3"
                      aria-label="Discover categories"
                    >
                      {DISCOVERY_VERTICALS.map((v) => {
                        const isActive = v.id === portfolioStripActiveId;
                        return (
                          <Link
                            key={v.id}
                            to={portfolioVerticalHref(v.id)}
                            replace
                            className={cn(
                              "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight transition-colors sm:px-3 sm:py-1.5",
                              isActive
                                ? "border border-primary text-primary"
                                : "border border-transparent text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {v.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return assetPriceLowerRail;
            })()}
          </div>
        </div>
      </div>
      {howRetroPickHasOpened ? (
        <Suspense fallback={null}>
          <HowRetroPickWorksDialog open={howRetroPickOpen} onOpenChange={setHowRetroPickOpen} />
        </Suspense>
      ) : null}
    </header>
  );
};

export default Header;
