"use client";

import { useState } from "react";
import { X, CheckCircle2, ArrowDownToLine, Wallet, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useUserPortfolio } from "../../hooks/useUserPortfolio";
import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [100, 500, 1000, 5000];

const NETWORKS = [
  { id: "polygon", name: "Polygon (POS)", token: "USDC", badge: "Fast & Low Gas" },
  { id: "base", name: "Base", token: "USDC", badge: "L2 Low Fee" },
  { id: "arbitrum", name: "Arbitrum", token: "USDC", badge: "L2" },
];

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { balance, deposit } = useUserPortfolio();
  const { address, isConnected } = useMarketsWalletConnect();

  const [amount, setAmount] = useState<number>(500);
  const [selectedNetwork, setSelectedNetwork] = useState("polygon");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDeposit = () => {
    if (amount <= 0) return;
    setIsSubmitting(true);

    setTimeout(() => {
      deposit(amount);
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1600);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0C1222] p-6 shadow-2xl text-white animate-in zoom-in-95 duration-150 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-label="Deposit USDC"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <ArrowDownToLine className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white leading-tight">
              Deposit Test USDC
            </h2>
            <p className="text-xs text-slate-400">
              Instant testnet &amp; simulation liquidity
            </p>
          </div>
        </div>

        {/* Current Balance Display */}
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#111827]/80 p-3.5">
          <span className="text-xs font-semibold text-slate-400">Current Tradeable Balance</span>
          <span className="font-mono text-sm font-black text-emerald-400">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
          </span>
        </div>

        {/* Network Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-400">Select Network</label>
          <div className="grid grid-cols-3 gap-2">
            {NETWORKS.map((net) => (
              <button
                key={net.id}
                type="button"
                onClick={() => setSelectedNetwork(net.id)}
                className={cn(
                  "flex flex-col items-start p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                  selectedNetwork === net.id
                    ? "border-blue-500/60 bg-blue-600/15 text-white"
                    : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/15",
                )}
              >
                <span className="text-xs font-bold">{net.name}</span>
                <span className="text-[10px] text-blue-400 font-mono font-medium">{net.token}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input & Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-400">Deposit Amount</label>
            <span className="text-[11px] font-mono text-slate-500 font-semibold">USDC</span>
          </div>

          <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#141C30] px-4 py-3 focus-within:border-blue-500 shadow-inner">
            <span className="font-mono text-xl font-bold text-slate-400 mr-1.5">$</span>
            <input
              type="number"
              min="1"
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0.00"
              className="w-full bg-transparent font-mono text-xl font-black text-white outline-none placeholder:text-slate-600"
            />
          </div>

          {/* Quick Amount Presets */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val)}
                className={cn(
                  "rounded-xl border py-1.5 text-xs font-mono font-bold transition-all cursor-pointer",
                  amount === val
                    ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "border-white/[0.06] bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                +${val}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated New Balance */}
        <div className="rounded-2xl border border-blue-500/20 bg-blue-600/[0.06] p-3 text-xs flex items-center justify-between">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>New Balance after deposit</span>
          </span>
          <span className="font-mono font-black text-white">
            ${(balance + (amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
          </span>
        </div>

        {/* Success Alert */}
        {isSuccess && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Successfully deposited ${amount.toLocaleString()} USDC to your wallet!</span>
          </div>
        )}

        {/* Deposit Button */}
        <button
          type="button"
          disabled={isSubmitting || isSuccess || amount <= 0}
          onClick={handleDeposit}
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-extrabold text-white shadow-lg transition-all active:scale-[0.98] cursor-pointer",
            amount > 0 && !isSubmitting && !isSuccess
              ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
              : "bg-blue-600/40 text-white/50 cursor-not-allowed",
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Confirming Deposit...</span>
            </span>
          ) : isSuccess ? (
            <span>Deposit Complete!</span>
          ) : (
            <span>Deposit ${amount > 0 ? amount.toLocaleString() : "0"} USDC</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default DepositModal;
