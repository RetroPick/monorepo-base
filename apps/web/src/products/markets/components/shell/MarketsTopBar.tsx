import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

import Logo from "@/shared/components/Logo";
import { MarketsUserMenu } from "./MarketsUserMenu";
import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import { AuthDialog } from "../../wallet/components/AuthDialog";
import { discoverPath, portfolioPath, leaderboardPath, intelligencePath } from "../../routes/paths";
import type { MarketsNavTab } from "./types";

interface MarketsTopBarProps {
  title?: string;
  onMenuOpen?: () => void;
  onAlertsOpen?: () => void;
  onSearchChange?: (query: string) => void;
  activeTab?: MarketsNavTab;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
}

const TOP_NAV_LINKS = [
  { label: "Markets", path: discoverPath() },
  { label: "Intelligence", path: intelligencePath() },
  { label: "Portfolio", path: portfolioPath() },
];

export function MarketsTopBar({
  onMenuOpen,
  onSearchChange,
}: MarketsTopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isConnected, address } = useMarketsWalletConnect();
  const { isSessionAuthenticated, authenticate, sessionState } = useMarketsWalletSession();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Keep state in sync with URL search param
  useEffect(() => {
    const urlQuery = searchParams.get("search") ?? "";
    setSearchQuery(urlQuery);
  }, [searchParams]);

  // Global Keyboard Shortcut: Press '/' to focus search bar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchChange) {
      onSearchChange(searchQuery);
    } else {
      navigate(`${discoverPath()}?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-blue-500/15 bg-[#090E1A]/95 backdrop-blur-2xl text-white shadow-xl shadow-black/40">
        {/* Main Top Bar Navigation Header */}
        <div className="mx-auto flex h-[68px] sm:h-[72px] max-w-[1720px] w-full items-center justify-between gap-2 sm:gap-4 lg:gap-6 px-3 sm:px-5 lg:px-6">
          {/* Left: Mobile Drawer (< md) + Logo + Nav Links (>= md) */}
          <div className="flex items-center gap-2.5 sm:gap-4 lg:gap-6 shrink-0">
            {/* Mobile Drawer Button: Strictly visible ONLY when nav links are hidden (< md) */}
            <button
              type="button"
              onClick={onMenuOpen}
              className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#101726]/80 text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/10 transition-all cursor-pointer shrink-0"
              aria-label="Open navigation sidebar"
              title="Open Navigation Menu"
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300"
              >
                <rect width="18" height="18" x="3" y="3" rx="4" />
                <line x1="9" x2="9" y1="3" y2="21" />
              </svg>
            </button>

            {/* RetroPick Brand Logo */}
            <Link
              to={discoverPath()}
              className="flex items-center gap-2 sm:gap-2.5 transition-transform hover:opacity-90 shrink-0"
              aria-label="RetroPick Home"
            >
              <Logo size={36} className="h-8 w-auto filter drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
              <span className="font-display text-lg sm:text-xl font-black tracking-tight text-white">
                RetroPick
              </span>
            </Link>

            {/* Nav Links: Strictly visible on desktop/laptop (>= md), hidden on mobile */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-7 ml-2 lg:ml-5">
              {TOP_NAV_LINKS.map((link) => {
                const isActive = (() => {
                  if (link.label === "Markets") {
                    return (
                      location.pathname === "/markets" ||
                      location.pathname === "/" ||
                      location.pathname.startsWith("/markets/events") ||
                      location.pathname.startsWith("/markets/m/")
                    );
                  }
                  if (link.label === "Intelligence" || link.label === "Leaderboard") {
                    return (
                      location.pathname.startsWith("/markets/intelligence") ||
                      location.pathname === "/markets/leaderboard" ||
                      location.pathname === "/markets/traders" ||
                      location.pathname === "/markets/whales"
                    );
                  }
                  if (link.label === "Portfolio") {
                    return (
                      location.pathname.startsWith("/markets/portfolio") ||
                      location.pathname.startsWith("/markets/paper-trade") ||
                      location.pathname.startsWith("/markets/funding")
                    );
                  }
                  return location.pathname === link.path;
                })();

                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    className={`py-1 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${
                      isActive ? "text-white font-extrabold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Dynamic Fluid Search Bar (Grows on large screens, shrinks gracefully on small screens) */}
          <div className="flex-1 max-w-sm md:max-w-md lg:max-w-xl xl:max-w-2xl px-2 sm:px-4 min-w-[120px]">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={handleSearchInputChange}
                placeholder="Search markets..."
                aria-label="Search markets"
                className="h-9.5 w-full rounded-xl border border-blue-500/20 bg-[#101726]/90 py-2 pl-9 pr-8 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 outline-none transition-all focus:border-blue-500 focus:bg-[#131D33] focus:ring-1 focus:ring-blue-500/25"
              />
              <kbd
                onClick={() => searchInputRef.current?.focus()}
                className="hidden md:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-blue-500/20 bg-blue-600/10 px-1.5 py-0.5 font-mono text-[10px] text-blue-400 cursor-pointer hover:bg-blue-600/20 transition-colors"
              >
                /
              </kbd>
            </form>
          </div>

          {/* Right: How it works + Auth Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* How it works link */}
            <div className="hidden 2xl:flex items-center text-sm font-medium text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 mr-1">
              <span>ⓘ How it works</span>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {isConnected && address ? (
                <MarketsUserMenu />
              ) : (
                <>
                  {/* Log in Button - Rounded Rectangle */}
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="h-9 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs sm:text-sm font-bold text-slate-200 transition-all hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    Log in
                  </button>

                  {/* Sign up Button - Rounded Rectangle */}
                  <button
                    type="button"
                    onClick={() => openAuth("signup")}
                    className="h-9 rounded-xl bg-blue-600 px-4 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/30 transition-all hover:bg-blue-500 active:scale-95 cursor-pointer"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthDialog
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}
