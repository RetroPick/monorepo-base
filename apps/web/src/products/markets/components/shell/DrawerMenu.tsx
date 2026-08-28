import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, Search, TrendingUp, Award, Sparkles, PieChart, Wallet, ShieldCheck, ChevronRight } from "lucide-react";

import Logo from "@/shared/components/Logo";
import { cn } from "@/shared/lib/utils";
import {
  DISCOVERY_VERTICALS,
  type DiscoveryVerticalId,
} from "@/shared/lib/discovery-verticals";

import {
  discoverPath,
  leaderboardPath,
  intelligencePath,
  portfolioPath,
  walletConnectPath,
} from "../../routes/paths";
import { AuthDialog } from "../../wallet/components/AuthDialog";

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
  onCategorySelect?: (id: DiscoveryVerticalId) => void;
  onSearchChange?: (query: string) => void;
}

export function DrawerMenu({ open, onClose, onCategorySelect, onSearchChange }: DrawerMenuProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerSearch, setDrawerSearch] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  if (!open) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (drawerSearch.trim()) {
      if (onSearchChange) {
        onSearchChange(drawerSearch.trim());
      } else {
        navigate(`${discoverPath()}?search=${encodeURIComponent(drawerSearch.trim())}`);
      }
      onClose();
    }
  };

  const navItems = [
    { label: "Markets", path: discoverPath(), icon: TrendingUp },
    { label: "Leaderboard", path: leaderboardPath(), icon: Award },
    { label: "Portfolio", path: portfolioPath(), icon: PieChart },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Slide-out Sidebar Drawer */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[min(340px,85vw)] flex-col border-r border-white/10 bg-[#090E1A] text-white shadow-2xl animate-in slide-in-from-left duration-200"
        aria-label="Navigation drawer"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <Link
            to={discoverPath()}
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <Logo size={36} className="h-8 w-auto filter drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <span className="font-display text-xl font-black text-white">RetroPick</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Synchronized Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
              placeholder="Search markets..."
              className="h-10 w-full rounded-xl border border-blue-500/20 bg-[#101726] py-2 pl-10 pr-4 text-xs font-medium text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />
          </form>

          {/* Main Navigation Pillars */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Navigation
            </span>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.path ||
                (item.label === "Markets" && location.pathname.startsWith("/markets/m/")) ||
                (item.label === "Intelligence" && (location.pathname.startsWith("/markets/intelligence") || location.pathname.startsWith("/markets/leaderboard")));

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
                    active
                      ? "bg-blue-600/20 border border-blue-500/30 text-white font-extrabold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", active ? "text-blue-400" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                </Link>
              );
            })}
          </div>

          {/* Categories Grid */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Explore Categories
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {DISCOVERY_VERTICALS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    onCategorySelect?.(v.id);
                    onClose();
                  }}
                  className="flex items-center justify-start rounded-xl border border-white/5 bg-[#0D1424] px-3 py-2 text-left text-xs font-semibold text-slate-300 hover:border-blue-500/30 hover:bg-[#131D33] hover:text-white transition-all cursor-pointer truncate"
                >
                  <span className="truncate">{v.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer: Wallet & Status */}
        <div className="border-t border-white/[0.08] p-4 bg-[#070B14]">
          <button
            type="button"
            onClick={() => {
              setAuthOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>Log in / Connect Wallet</span>
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-500">
            RetroPick Decentralized Consensus · UMA Oracle
          </p>
        </div>
      </aside>

      {/* Direct Polymarket Login Modal */}
      <AuthDialog isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
