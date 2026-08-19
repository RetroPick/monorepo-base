import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  ChevronDown,
  PieChart,
  Shield,
  Sparkles,
  Mail,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";
import { truncateAddress } from "../../wallet/lib/truncateAddress";
import { portfolioPath, discoverPath } from "../../routes/paths";

export function MarketsUserMenu() {
  const { address, session, disconnect } = useMarketsWalletConnect();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!address) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProviderBadge = () => {
    if (session?.type === "google") return { label: "Google Account", icon: "G", color: "bg-blue-600" };
    if (session?.type === "email") return { label: "Email Account", icon: "@", color: "bg-emerald-600" };
    if (session?.type === "metamask") return { label: "MetaMask", icon: "🦊", color: "bg-amber-600" };
    if (session?.type === "coinbase") return { label: "Coinbase", icon: "🔵", color: "bg-blue-600" };
    if (session?.type === "phantom") return { label: "Phantom", icon: "👻", color: "bg-purple-600" };
    return { label: "Web3 Wallet", icon: "W", color: "bg-indigo-600" };
  };

  const provider = getProviderBadge();

  return (
    <div ref={menuRef} className="relative">
      {/* Sleek Connected Profile Pill Button matching Polymarket */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#101726] hover:bg-[#162035] hover:border-blue-500/30 px-3 py-1.5 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
      >
        {/* Avatar Circle with Online Dot */}
        <div className={cn("relative flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black text-white shadow-inner", provider.color)}>
          <span>{session?.email ? session.email[0].toUpperCase() : address.slice(2, 4).toUpperCase()}</span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#090E1A] bg-emerald-400" />
        </div>

        {/* Address & Balance */}
        <div className="flex flex-col items-start leading-tight">
          <span className="font-mono text-xs text-slate-200">
            {session?.email ? session.email.split("@")[0] : truncateAddress(address)}
          </span>
          <span className="text-[10px] font-medium text-emerald-400 font-mono">$0.00 Cash</span>
        </div>

        <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>

      {/* Floating Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#0E1422] p-3 text-white shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
          {/* Header with Address & Network Badge */}
          <div className="rounded-xl border border-white/[0.06] bg-[#121929] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-400">{provider.label}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Polygon · 137
              </span>
            </div>

            {session?.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium truncate">
                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{session.email}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-xs font-bold text-slate-200">
                {truncateAddress(address)}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Copy Address"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-1">
            <Link
              to={portfolioPath()}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <PieChart className="h-4 w-4 text-blue-400" />
                <span>My Portfolio & Positions</span>
              </div>
            </Link>

            <Link
              to={discoverPath()}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Prediction Markets</span>
              </div>
            </Link>

            <a
              href={`https://polygonscan.com/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4 text-slate-400" />
                <span>View on PolygonScan</span>
              </div>
            </a>
          </div>

          {/* Disconnect & Sign Actions */}
          <div className="border-t border-white/[0.06] pt-2">
            <button
              type="button"
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out / Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketsUserMenu;
