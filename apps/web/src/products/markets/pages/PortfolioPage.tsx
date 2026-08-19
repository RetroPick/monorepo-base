import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Coins, Briefcase, ShieldCheck, RefreshCw, ArrowRight, DollarSign } from "lucide-react";

import { ConnectWalletButton } from "../wallet/components/ConnectWalletButton";
import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { TradingLifecyclePanel } from "../trading/components/TradingLifecyclePanel";
import { useMarketsWalletSession } from "../wallet/hooks/useMarketsWalletSession";
import { FundingSection } from "../funding/components/FundingSection";
import { fundingPath, discoverPath } from "../routes/paths";
import { cn } from "@/shared/lib/utils";

export function PortfolioPage() {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "paper" ? "paper" : "live";

  const [paperBalance, setPaperBalance] = useState(10000);
  const [resetting, setResetting] = useState(false);

  const resetBalance = () => {
    setResetting(true);
    setTimeout(() => {
      setPaperBalance(10000);
      setResetting(false);
    }, 400);
  };

  const handleTabChange = (tab: "live" | "paper") => {
    setSearchParams({ tab });
  };

  return (
    <MarketsAppShell title="Portfolio & Trading Sandbox - RetroPick">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Title & Sub-Tab Switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-blue-500/15 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Briefcase className="h-7 w-7 text-blue-400" />
              Portfolio & Positions
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Kelola posisi aktif on-chain Anda atau uji strategi dengan mode simulasi (*Paper Trading*).
            </p>
          </div>

          {/* Tab Pills */}
          <div className="flex items-center gap-2 rounded-2xl bg-[#0B101C] p-1.5 border border-blue-500/20 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("live")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "live"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Coins className="h-4 w-4 text-emerald-300" />
              <span>Live Positions</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("paper")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer",
                activeTab === "paper"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <span>Paper Trading (Demo)</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: LIVE ON-CHAIN PORTFOLIO                               */}
        {/* ============================================================ */}
        {activeTab === "live" && (
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            {!isSessionAuthenticated ? (
              <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-blue-500/20 bg-[#101726]/95 px-5 py-4 shadow-xl">
                <p className="min-w-0 flex-1 text-sm text-slate-300">
                  Hubungkan wallet Anda untuk melihat posisi trading aktif dan riwayat transaksi on-chain.
                </p>
                <ConnectWalletButton className="h-10 shrink-0 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500" label="Connect Wallet" />
              </div>
            ) : null}

            <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-5 shadow-xl sm:p-6">
              <TradingLifecyclePanel />
            </div>

            {/* Deposit & Funding Section */}
            <section className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-5 shadow-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white tracking-tight">
                  <Coins className="h-5 w-5 text-blue-400" aria-hidden />
                  Deposit & Funding
                </h2>
                <Link to={fundingPath()} className="text-xs font-bold text-blue-400 hover:underline">
                  Buka Halaman Funding →
                </Link>
              </div>
              <FundingSection />
            </section>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PAPER TRADING SANDBOX                                 */}
        {/* ============================================================ */}
        {activeTab === "paper" && (
          <div className="space-y-6">
            {/* Header Reset Banner */}
            <div className="rounded-2xl border border-emerald-500/30 bg-[#101726]/95 p-5 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Mode Simulasi (Paper Trading Sandbox)</h2>
                    <p className="text-xs text-slate-400">
                      Latih keahlian prediksi dan uji strategi trading tanpa risiko modal uang asli.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetBalance}
                  disabled={resetting}
                  className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-600/10 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-600/20 transition-all cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
                  <span>Reset Saldo Virtual $10,000</span>
                </button>
              </div>
            </div>

            {/* Simulated Balance Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-5 shadow-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saldo Virtual Tersedia</span>
                <p className="mt-1 font-mono text-3xl font-black text-emerald-400 tabular-nums">
                  ${paperBalance.toLocaleString()}.00
                </p>
                <span className="text-xs text-slate-400 mt-1 block">Virtual USDC Sandbox</span>
              </div>

              <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-5 shadow-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Posisi Simulasi Aktif</span>
                <p className="mt-1 font-mono text-3xl font-black text-white tabular-nums">2 Open Trades</p>
                <span className="text-xs text-emerald-400 mt-1 block">+ $420.00 (+4.2% Return)</span>
              </div>

              <div className="rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-5 shadow-xl">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profil Risiko</span>
                <p className="mt-1 font-mono text-2xl font-black text-blue-400">Zero Risk</p>
                <span className="text-xs text-slate-400 mt-1 block">100% Bebas Risiko Finansial</span>
              </div>
            </div>

            {/* Action CTA */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-500/15 bg-[#101726]/95 p-8 text-center shadow-xl">
              <DollarSign className="h-12 w-12 text-blue-400 mb-3" />
              <h3 className="text-xl font-bold text-white">Siap Mencoba Trading Simulasi?</h3>
              <p className="mt-1 max-w-md text-xs text-slate-400">
                Pilih pasar prediksi apa pun dari katalog. Saat menggunakan mode Paper Trading, semua order dieksekusi instan menggunakan saldo virtual Anda.
              </p>

              <Link
                to={discoverPath()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
              >
                <span>Jelajahi Pasar Prediksi</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </MarketsAppShell>
  );
}

export default PortfolioPage;

