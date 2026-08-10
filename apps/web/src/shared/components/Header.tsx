"use client";

import { useCallback, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Menu, Search } from "lucide-react";

import Logo from "@/shared/components/Logo";
import { ConnectWalletButton } from "@/products/markets/wallet/components/ConnectWalletButton";
import { WalletAddressDisclosure } from "@/products/markets/wallet/components/WalletAddressDisclosure";
import { useMarketsWalletConnect } from "@/products/markets/wallet/hooks/useMarketsWalletConnect";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/shared/components/ui/sheet";
import {
  DISCOVERY_VERTICALS,
  discoveryVerticalFromSearchParam,
  type DiscoveryVerticalId,
} from "@/shared/lib/discovery-verticals";
import { cn } from "@/shared/lib/utils";
import { discoverPath, portfolioPath } from "@/products/markets/routes/paths";

export interface HeaderProps {
  omitBottomDivider?: boolean;
  discoveryNav?: {
    verticals: typeof DISCOVERY_VERTICALS;
    activeVerticalId: DiscoveryVerticalId;
    onVerticalChange: (id: DiscoveryVerticalId) => void;
  };
  portfolioDiscoverNav?: {
    verticals: typeof DISCOVERY_VERTICALS;
    activeVerticalId: DiscoveryVerticalId;
    onVerticalChange: (id: DiscoveryVerticalId) => void;
  };
}

const navItems = [
  { name: "Markets", path: discoverPath() },
  { name: "Portfolio", path: portfolioPath() },
] as const;

export default function Header({ omitBottomDivider, discoveryNav, portfolioDiscoverNav }: HeaderProps) {
  const location = useLocation();
  const [headerSearchParams] = useSearchParams();
  const railRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isConnected } = useMarketsWalletConnect();

  const pathNorm = location.pathname.replace(/\/+$/, "") || "/";
  const isMarketsPage = pathNorm === discoverPath() || pathNorm.startsWith("/markets/events") || pathNorm.startsWith("/markets/m/");
  const isPortfolioPage = pathNorm === portfolioPath();

  const isNavItemActive = (path: string) => {
    if (path === discoverPath()) return isMarketsPage && !isPortfolioPage;
    return location.pathname === path;
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta) return;
    railRef.current.scrollLeft += delta;
  };

  const renderVerticalPills = (
    verticals: typeof DISCOVERY_VERTICALS,
    activeId: DiscoveryVerticalId,
    onChange: (id: DiscoveryVerticalId) => void,
    ariaLabel: string,
  ) => (
    <div
      ref={railRef}
      onWheel={handleWheel}
      className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex min-h-10 min-w-max flex-nowrap items-center gap-1.5 px-0 sm:gap-2" aria-label={ariaLabel}>
        {verticals.map((v) => {
          const isActive = v.id === activeId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
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

  const renderPortfolioLinkStrip = () => {
    const portfolioStripActiveId = discoveryVerticalFromSearchParam(headerSearchParams.get("vertical"));
    const portfolioVerticalHref = (id: DiscoveryVerticalId) => {
      const p = new URLSearchParams(headerSearchParams);
      if (id === "trending") p.delete("vertical");
      else p.set("vertical", id);
      const qs = p.toString();
      return qs.length > 0 ? `${portfolioPath()}?${qs}` : portfolioPath();
    };
    return (
      <div
        ref={railRef}
        onWheel={handleWheel}
        className="w-full min-w-0 overflow-x-auto no-scrollbar overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex min-h-10 min-w-max flex-nowrap items-center gap-2 px-0 sm:gap-3" aria-label="Discover categories">
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
  };

  const lowerRail = (() => {
    if (discoveryNav && isMarketsPage) {
      return renderVerticalPills(
        discoveryNav.verticals,
        discoveryNav.activeVerticalId,
        discoveryNav.onVerticalChange,
        "Discover categories",
      );
    }
    if (portfolioDiscoverNav) {
      return renderVerticalPills(
        portfolioDiscoverNav.verticals,
        portfolioDiscoverNav.activeVerticalId,
        portfolioDiscoverNav.onVerticalChange,
        "Discover categories",
      );
    }
    if (isPortfolioPage) return renderPortfolioLinkStrip();
    return null;
  })();

  return (
    <header
      id="app-site-header"
      className={cn(
        "sticky inset-x-0 top-0 z-50 shrink-0 bg-background/90 backdrop-blur-md dark:bg-background/95",
        omitBottomDivider ? "border-b-0" : "border-b border-border/40 dark:border-white/[0.06]",
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
              <SheetContent side="left" className="flex w-[min(20rem,80vw)] flex-col gap-6 px-5 pt-8">
                <Link to={discoverPath()} className="flex items-center gap-2" onClick={() => setMobileNavOpen(false)}>
                  <Logo className="size-7" />
                  <div className="text-sm font-semibold tracking-tight text-foreground">RetroPick</div>
                </Link>
                <nav className="flex flex-col gap-1" aria-label="Main navigation (mobile)">
                  {navItems.map((item) => (
                    <SheetClose asChild key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          isNavItemActive(item.path)
                            ? "bg-primary/15 text-primary"
                            : "text-foreground/85 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.name}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link to={discoverPath()} className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5">
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

          <nav className="hidden min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto no-scrollbar lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isNavItemActive(item.path)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.name}
              </Link>
            ))}
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
              className="inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-border/60 bg-background/75 px-3 text-xs font-semibold text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted hover:text-foreground sm:h-9 sm:px-3.5 sm:text-sm"
              aria-label="How RetroPick works"
              title="How RetroPick works"
            >
              How?
            </button>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {isConnected ? (
                <WalletAddressDisclosure compact />
              ) : (
                <ConnectWalletButton className="h-8 shrink-0 rounded-lg px-3 text-xs font-semibold sm:h-9 sm:px-4 sm:text-sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {lowerRail ? (
        <div className="w-full min-w-0 border-t border-border/40 bg-muted/40 py-1.5 dark:border-white/[0.08] dark:bg-card/40">
          <div className="mx-auto max-w-screen-2xl px-5 sm:px-8">{lowerRail}</div>
        </div>
      ) : null}
    </header>
  );
}
