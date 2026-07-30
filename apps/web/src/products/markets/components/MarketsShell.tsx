import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { BarChart3, Home, Radio, Wallet } from "lucide-react";

import { useMarketsCapabilities } from "../hooks/useMarketsQueries";

const navItemClass = (active: boolean) =>
  clsx(
    "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-medium transition-colors",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );

export function MarketsShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const capabilities = useMarketsCapabilities();
  const intelligence = capabilities.data?.intelligence === true;

  const path = location.pathname;
  const isMarkets = path === "/markets" || path.startsWith("/markets/events");
  const isSignals = path.startsWith("/markets/signals");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">RetroPick</p>
            <h1 className="text-lg font-semibold leading-tight">Markets</h1>
          </div>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            Read-only
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-24">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur"
        aria-label="Markets navigation"
      >
        <div className="mx-auto flex max-w-3xl">
          <Link to="/markets" className={navItemClass(isMarkets)} aria-current={isMarkets ? "page" : undefined}>
            <Home className="h-5 w-5" aria-hidden />
            Discover
          </Link>
          {intelligence ? (
            <Link
              to="/markets/signals"
              className={navItemClass(isSignals)}
              aria-current={isSignals ? "page" : undefined}
            >
              <Radio className="h-5 w-5" aria-hidden />
              Signals
            </Link>
          ) : (
            <span className={clsx(navItemClass(false), "cursor-not-allowed opacity-40")} aria-disabled>
              <Radio className="h-5 w-5" aria-hidden />
              Signals
            </span>
          )}
          <span className={clsx(navItemClass(false), "cursor-not-allowed opacity-40")} aria-disabled title="Coming in a future phase">
            <Wallet className="h-5 w-5" aria-hidden />
            Portfolio
          </span>
          <Link to="/prism" className={navItemClass(path.startsWith("/prism"))}>
            <BarChart3 className="h-5 w-5" aria-hidden />
            PRISM
          </Link>
        </div>
      </nav>
    </div>
  );
}
