"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Check, Copy } from "lucide-react";
import { MarketsAppShell } from "../../components/shell/MarketsAppShell";
import { AuthDialog } from "../components/AuthDialog";
import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";
import { truncateAddress } from "../lib/truncateAddress";
import { discoverPath, portfolioPath } from "../../routes/paths";

export function WalletConnectPage() {
  const navigate = useNavigate();
  const { isConnected, address, disconnect, connect } = useMarketsWalletConnect();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <MarketsAppShell title="Login & Wallet" hideBottomNav>
      <div className="mx-auto flex min-h-[75vh] max-w-md flex-col items-center justify-center py-6">
        {isConnected && address ? (
          /* Connected State Card */
          <div className="w-full rounded-[28px] border border-white/10 bg-[#0B101D] p-6 sm:p-8 shadow-2xl text-white space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Active</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#121827] p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-400">Polygon Network · Chain 137</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-white">{truncateAddress(address)}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <Link
                to={portfolioPath()}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-md shadow-blue-600/25"
              >
                Go to My Portfolio
              </Link>
              <button
                type="button"
                onClick={() => disconnect()}
                className="w-full rounded-xl border border-rose-500/20 bg-rose-500/10 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        ) : (
          /* Exact Polymarket Login Card */
          <div className="w-full">
            <AuthDialog isOpen={true} onClose={() => navigate(discoverPath())} />
          </div>
        )}
      </div>
    </MarketsAppShell>
  );
}

export default WalletConnectPage;
