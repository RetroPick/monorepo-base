import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, Edit2, CheckCircle2, QrCode } from "lucide-react";
import { useAccount } from "wagmi";

export interface TradeOption {
  label: string;
  percentage: number;
}

interface PolymarketTradeBoxProps {
  marketId?: string;
  marketTitle?: string;
  image?: string;
  isDirection?: boolean;
  probYes?: number;
  options?: TradeOption[];
  selectedOptionIdx?: number;
  onSelectOptionIdx?: (idx: number) => void;
  onTradeSuccess?: () => void;
}

export function PolymarketTradeBox({
  marketId = "btc-up-down-5m",
  marketTitle = "BTC Up or Down 5m",
  image = "/images/markets/crypto/bitcoin.webp",
  isDirection = true,
  probYes = 51,
  options,
  selectedOptionIdx = 0,
  onSelectOptionIdx,
  onTradeSuccess,
}: PolymarketTradeBoxProps) {
  const { isConnected } = useAccount();

  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [internalSelectedIdx, setInternalSelectedIdx] = useState<number>(selectedOptionIdx);
  const [selectedDirection, setSelectedDirection] = useState<"up" | "down">("up");
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const activeIdx = onSelectOptionIdx ? selectedOptionIdx : internalSelectedIdx;
  const setOptionIndex = (idx: number) => {
    if (onSelectOptionIdx) {
      onSelectOptionIdx(idx);
    } else {
      setInternalSelectedIdx(idx);
    }
  };

  const hasCustomOptions = options && options.length >= 2;

  // Active price calculation
  const activePricePct = hasCustomOptions
    ? (options[activeIdx]?.percentage ?? 50)
    : isDirection
      ? (selectedDirection === "up" ? 1 : 99)
      : (selectedDirection === "up" ? probYes : 100 - probYes);

  const pricePerShare = Math.max(0.004, activePricePct / 100);
  const estimatedPayout = amount > 0 ? Math.round((amount / pricePerShare) * 1) : 0;

  const activeLabel = hasCustomOptions
    ? options[activeIdx]?.label
    : isDirection
      ? (selectedDirection === "up" ? "Up" : "Down")
      : (selectedDirection === "up" ? "Yes" : "No");

  const handleAddAmount = (addVal: number) => {
    setAmount((prev) => prev + addVal);
  };

  const handleExecuteTrade = () => {
    if (amount <= 0) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      if (onTradeSuccess) onTradeSuccess();
      setTimeout(() => setShowSuccess(false), 4000);
    }, 900);
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* MAIN TRADING CARD CONTAINER                                  */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all space-y-4">
        {/* Top Header: Avatar + Title + Active Choice */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <img
              src={image}
              alt={marketTitle}
              className="h-9 w-9 rounded-xl object-contain bg-[#080D18] p-1 border border-white/10 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white line-clamp-1">{marketTitle}</h4>
              <span className="text-[11px] font-extrabold text-emerald-400 truncate block">
                {activeLabel} · <span className="text-white">Yes</span>
              </span>
            </div>
          </div>

          {/* Market / 1-Tap Dropdown */}
          <div className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition-colors shrink-0">
            <span>Market</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Buy / Sell Tabs */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab("buy")}
            className={cn(
              "pb-1 transition-all cursor-pointer",
              tab === "buy" ? "text-white border-b-2 border-white font-black" : "text-slate-400 hover:text-slate-200",
            )}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setTab("sell")}
            className={cn(
              "pb-1 transition-all cursor-pointer",
              tab === "sell" ? "text-white border-b-2 border-white font-black" : "text-slate-400 hover:text-slate-200",
            )}
          >
            Sell
          </button>
        </div>

        {/* Big Outcome Choice Pills (Yes vs No / Up vs Down) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setSelectedDirection("up")}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm",
              selectedDirection === "up"
                ? "bg-[#10B981] border-emerald-400 text-slate-950 font-black shadow-emerald-500/20"
                : "bg-[#0D281E] border-emerald-500/25 text-emerald-400 hover:bg-[#133A2C]",
            )}
          >
            <span>{isDirection ? "Up" : "Yes"}</span>
            <span className="font-mono text-xs font-black">{activePricePct < 1 ? "0.4¢" : `${activePricePct}¢`}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedDirection("down")}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm",
              selectedDirection === "down"
                ? "bg-[#EF4444] border-rose-400 text-white font-black shadow-rose-500/20"
                : "bg-[#24151C] border-rose-500/20 text-rose-400/90 hover:bg-[#351C26]",
            )}
          >
            <span>{isDirection ? "Down" : "No"}</span>
            <span className="font-mono text-xs font-black">
              {100 - activePricePct > 99 ? "99.6¢" : `${Math.round((100 - activePricePct) * 10) / 10}¢`}
            </span>
          </button>
        </div>

        {/* Amount Input with $0.00 cash & Increments */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white">Amount</span>
            <span className="font-mono text-[11px] font-semibold text-slate-400">$0.00 cash</span>
          </div>

          <div className="relative">
            <input
              type="number"
              value={amount === 0 ? "" : amount}
              onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="$0"
              className="w-full rounded-xl border border-white/15 bg-[#080D18] px-4 py-3 font-mono text-2xl font-black text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setAmount(0)}
              className="absolute right-3 top-3.5 text-xs font-bold text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          </div>

          {/* Quick Increment Pills: +$1, +$5, +$10, +$100 */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[1, 5, 10, 100].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => handleAddAmount(inc)}
                className="rounded-lg border border-white/10 bg-[#0A0F1D] py-1.5 text-xs font-mono font-bold text-slate-300 hover:border-white/25 hover:bg-[#121929] hover:text-white transition-all cursor-pointer text-center"
              >
                +${inc}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Return Summary */}
        {amount > 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-[#080D18] p-3 text-xs space-y-1.5 font-semibold text-slate-400 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span>Total Investment</span>
              <span className="font-mono font-bold text-white">${amount.toFixed(2)} USDC</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Est. Potential Payout</span>
              <span className="font-mono font-bold text-emerald-400">${estimatedPayout.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {showSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-2.5 text-xs font-bold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Order Placed Successfully!</span>
          </div>
        )}

        {/* Main Action Button */}
        <button
          type="button"
          disabled={isSubmitting || amount <= 0}
          onClick={handleExecuteTrade}
          className={cn(
            "w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg",
            amount > 0
              ? selectedDirection === "up"
                ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/25"
                : "bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/25"
              : "bg-white/10 text-slate-500 cursor-not-allowed",
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Executing Order...
            </span>
          ) : (
            <span>
              {tab === "buy" ? "Trade Now" : "Place Sell Order"} {amount > 0 ? `($${amount})` : ""}
            </span>
          )}
        </button>

        {/* Disclaimer */}
        <p className="text-center text-[10px] text-slate-500 leading-tight">
          By trading, you agree to the <span className="underline hover:text-slate-400 cursor-pointer">Terms of Use</span>.
        </p>
      </div>

      {/* ============================================================ */}
      {/* RETROPICK APP QR CODE BANNER (Matching Polymarket Screenshot) */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-xl">
        <div className="space-y-1">
          <h5 className="font-extrabold text-sm leading-snug">Download the RetroPick App</h5>
          <p className="text-[11px] text-blue-100 font-medium">Trade with zero latency & get instant live alerts</p>
          <span className="inline-block rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase mt-1">
            RETRO20
          </span>
        </div>

        <div className="h-16 w-16 rounded-xl bg-white p-1.5 shrink-0 flex items-center justify-center shadow-md">
          <QrCode className="h-full w-full text-slate-900" />
        </div>
      </div>
    </div>
  );
}
