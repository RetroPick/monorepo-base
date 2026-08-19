import { useState } from "react";
import { Link } from "react-router-dom";
import { DollarSign, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";

import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { discoverPath } from "../routes/paths";

export function PaperTradePage() {
  const [paperBalance, setPaperBalance] = useState(10000);
  const [resetting, setResetting] = useState(false);

  const resetBalance = () => {
    setResetting(true);
    setTimeout(() => {
      setPaperBalance(10000);
      setResetting(false);
    }, 400);
  };

  return (
    <MarketsAppShell title="Paper Trading Mode - RetroPick">
      {/* Header Banner */}
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-[#090D16] p-6 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white">Paper Trading Simulation</h1>
              <p className="text-xs text-slate-400">
                Practice prediction trading with simulated zero-risk funds before deploying real capital.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetBalance}
            disabled={resetting}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
            <span>Reset $10,000 Balance</span>
          </button>
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0E131F] p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Virtual Portfolio Balance</span>
          <p className="mt-1 font-mono text-3xl font-black text-emerald-400 tabular-nums">
            ${paperBalance.toLocaleString()}.00
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Virtual USDC Sandbox</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0E131F] p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Simulated Open Positions</span>
          <p className="mt-1 font-mono text-3xl font-black text-white tabular-nums">2 Trades</p>
          <span className="text-xs text-emerald-400 mt-1 block">+ $420.00 (+4.2%)</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0E131F] p-5 shadow-lg">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risk Profile</span>
          <p className="mt-1 font-mono text-2xl font-black text-blue-400">Zero Risk</p>
          <span className="text-xs text-slate-400 mt-1 block">Free Sandbox Trading</span>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#090D18] p-8 text-center shadow-xl">
        <DollarSign className="h-12 w-12 text-blue-400 mb-3" />
        <h2 className="text-xl font-bold text-white">Ready to trade with Virtual Funds?</h2>
        <p className="mt-1 max-w-md text-xs text-slate-400">
          Browse the prediction markets catalog and select any event. In Paper Trading mode, all orders execute instantly using your $10,000 sandbox balance.
        </p>

        <Link
          to={discoverPath()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
        >
          <span>Explore Prediction Markets</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </MarketsAppShell>
  );
}

export default PaperTradePage;
