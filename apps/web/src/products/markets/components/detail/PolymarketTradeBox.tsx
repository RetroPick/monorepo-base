"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, CheckCircle2, Info, Plus, Minus, ArrowDownToLine, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { useUserPortfolio } from "../../hooks/useUserPortfolio";
import { DepositModal } from "../deposit/DepositModal";

export interface TradeOption {
  label: string;
  percentage: number;
}

interface PolymarketTradeBoxProps {
  marketId?: string;
  marketTitle?: string;
  category?: string;
  image?: string;
  isDirection?: boolean;
  probYes?: number;
  options?: TradeOption[];
  selectedOptionIdx?: number;
  onSelectOptionIdx?: (idx: number) => void;
  onTradeSuccess?: () => void;
}

export function PolymarketTradeBox({
  marketId = "market-1",
  marketTitle = "Will OpenAI's valuation be between $900B and $1.00T at the end of September 2026?",
  category = "AI",
  image = "/images/markets/crypto/bitcoin.webp",
  isDirection = false,
  probYes = 45,
  options,
  selectedOptionIdx = 0,
  onSelectOptionIdx,
  onTradeSuccess,
}: PolymarketTradeBoxProps) {
  const { isConnected } = useAccount();
  const { balance, executeMarketTrade, placeLimitOrder } = useUserPortfolio();

  const [depositOpen, setDepositOpen] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [isOrderTypeDropdownOpen, setIsOrderTypeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [internalSelectedIdx, setInternalSelectedIdx] = useState<number>(selectedOptionIdx);
  const [selectedDirection, setSelectedDirection] = useState<"up" | "down">("up");

  // Market Order inputs
  const [marketAmount, setMarketAmount] = useState<number>(0);
  const [marketShares, setMarketShares] = useState<number>(0);

  // Limit Order inputs
  const [limitPriceCents, setLimitPriceCents] = useState<number>(probYes);
  const [limitShares, setLimitShares] = useState<number>(0);
  const [expiration, setExpiration] = useState<string>("Never");
  const [isExpirationDropdownOpen, setIsExpirationDropdownOpen] = useState(false);
  const expirationRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOrderTypeDropdownOpen(false);
      }
      if (expirationRef.current && !expirationRef.current.contains(e.target as Node)) {
        setIsExpirationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeIdx = onSelectOptionIdx ? selectedOptionIdx : internalSelectedIdx;
  const hasCustomOptions = options && options.length >= 2;

  // Active price calculation
  const activePricePct = hasCustomOptions
    ? (options[activeIdx]?.percentage ?? 45)
    : isDirection
    ? (selectedDirection === "up" ? 1 : 99)
    : (selectedDirection === "up" ? probYes : 100 - probYes);

  // Derive smart concise outcome subject name
  const getOutcomeName = (): string => {
    if (hasCustomOptions && options && options[activeIdx]) {
      return options[activeIdx].label;
    }
    if (isDirection) {
      return "Price";
    }

    const titleLower = marketTitle.toLowerCase();
    if (titleLower.includes("between") && titleLower.includes("valuation")) {
      return "Valuation $900B - $1.00T";
    }
    if (titleLower.includes("between")) {
      const match = marketTitle.match(/between\s+([^?]+)/i);
      if (match && match[1]) {
        return `Between ${match[1].trim().slice(0, 24)}`;
      }
    }
    if (titleLower.includes("end of august") || titleLower.includes("august 31")) {
      return "August 31";
    }
    if (titleLower.includes("end of september") || titleLower.includes("september 30")) {
      return "September 30";
    }
    if (titleLower.includes("openai")) {
      return "OpenAI";
    }
    if (titleLower.includes("bitcoin") || titleLower.includes("btc")) {
      return "Bitcoin";
    }
    if (titleLower.includes("ethereum") || titleLower.includes("eth")) {
      return "Ethereum";
    }
    return "Outcome";
  };

  const outcomeTitle = getOutcomeName();

  // Keep default limit price in sync with market price
  useEffect(() => {
    setLimitPriceCents(activePricePct);
  }, [activePricePct]);

  // Calculations for Market Buy
  const pricePerShare = Math.max(0.004, activePricePct / 100);
  const estimatedMarketShares = marketAmount > 0 ? Math.floor(marketAmount / pricePerShare) : 0;
  const estimatedMarketPayout = marketAmount > 0 ? estimatedMarketShares * 1 : 0;

  // Calculations for Limit Order
  const limitPriceDollars = limitPriceCents / 100;
  const limitTotalDollars = (limitShares * limitPriceDollars);
  const limitToWinDollars = limitShares > 0 ? (limitShares * (1 - limitPriceDollars)) : 0;
  const limitYouReceiveDollars = limitShares > 0 ? (limitShares * limitPriceDollars) : 0;

  const handleExecuteTrade = () => {
    setTradeError(null);
    const valid =
      orderType === "market"
        ? (tab === "buy" ? marketAmount > 0 : marketShares > 0)
        : limitShares > 0 && limitPriceCents > 0;

    if (!valid) return;

    try {
      if (orderType === "market") {
        executeMarketTrade({
          marketId,
          marketTitle,
          category,
          outcome: selectedDirection === "up" ? "YES" : "NO",
          side: tab,
          amountUsd: marketAmount,
          shares: tab === "buy" ? estimatedMarketShares : marketShares,
          priceCents: activePricePct,
        });
      } else {
        placeLimitOrder({
          marketId,
          marketTitle,
          outcome: selectedDirection === "up" ? "YES" : "NO",
          type: tab === "buy" ? "LIMIT BUY" : "LIMIT SELL",
          shares: limitShares,
          limitPriceCents,
        });
      }

      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setShowSuccess(true);
        if (onTradeSuccess) onTradeSuccess();
        setTimeout(() => setShowSuccess(false), 4000);
      }, 400);
    } catch (err: any) {
      setIsSubmitting(false);
      setTradeError(err.message || "Trade execution failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* MAIN TRADING CARD CONTAINER (Matching Polymarket Spec)       */}
      {/* ============================================================ */}
      <div className="rounded-[22px] border border-white/[0.08] bg-[#111624] p-5 shadow-2xl transition-all space-y-4 text-white">
        {/* Row 1: Image Thumbnail + Event Title + Outcome & Yes/No (Matching Polymarket Reference) */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-[#0A0F1D] border border-white/10 shrink-0 shadow-sm flex items-center justify-center">
            <img
              src={image || "/images/markets/crypto/bitcoin.webp"}
              alt={marketTitle}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/images/markets/crypto/bitcoin.webp";
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-xs font-medium text-slate-400 line-clamp-1" title={marketTitle}>
              {marketTitle}
            </div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-white leading-tight">
              <span className="truncate">{outcomeTitle}</span>
              <span className="text-slate-500">·</span>
              <span className={selectedDirection === "up" ? "text-emerald-400 font-extrabold shrink-0" : "text-rose-400 font-extrabold shrink-0"}>
                {selectedDirection === "up" ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>


        {/* Row 2: Buy / Sell Tabs + Order Type Dropdown (Market / Limit) */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          {/* Left: Buy / Sell Tabs */}
          <div className="flex items-center gap-4 text-sm font-bold">
            <button
              type="button"
              onClick={() => setTab("buy")}
              className={cn(
                "relative pb-1.5 transition-all cursor-pointer",
                tab === "buy"
                  ? "text-white font-extrabold"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              Buy
              {tab === "buy" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab("sell")}
              className={cn(
                "relative pb-1.5 transition-all cursor-pointer",
                tab === "sell"
                  ? "text-white font-extrabold"
                  : "text-slate-400 hover:text-slate-200",
              )}
            >
              Sell
              {tab === "sell" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-white" />
              )}
            </button>
          </div>

          {/* Right: Order Type Dropdown (Market / Limit) */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOrderTypeDropdownOpen(!isOrderTypeDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
            >
              <span className="capitalize">{orderType}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOrderTypeDropdownOpen && "rotate-180")} />
            </button>

            {isOrderTypeDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-32 overflow-hidden rounded-xl border border-white/10 bg-[#161D2F] p-1 shadow-2xl z-20 animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("market");
                    setIsOrderTypeDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                    orderType === "market" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <span>Market</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("limit");
                    setIsOrderTypeDropdownOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                    orderType === "limit" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5",
                  )}
                >
                  <span>Limit</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Outcome Choice Pills: Yes 45¢ / No 55¢ */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* YES Option */}
          <button
            type="button"
            onClick={() => setSelectedDirection("up")}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-all cursor-pointer shadow-sm",
              selectedDirection === "up"
                ? "bg-[#4E9362] hover:bg-[#458457] border-[#5EAD75] text-white font-extrabold shadow-emerald-900/30"
                : "bg-[#1B2232] border-white/5 text-slate-400 hover:bg-[#222B3F] hover:text-slate-200",
            )}
          >
            <span>{isDirection ? "Up" : "Yes"}</span>
            <span className="font-mono text-sm font-black">{activePricePct}¢</span>
          </button>

          {/* NO Option */}
          <button
            type="button"
            onClick={() => setSelectedDirection("down")}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-bold transition-all cursor-pointer shadow-sm",
              selectedDirection === "down"
                ? "bg-[#A64545] hover:bg-[#963C3C] border-[#BD5353] text-white font-extrabold shadow-rose-900/30"
                : "bg-[#1B2232] border-white/5 text-slate-400 hover:bg-[#222B3F] hover:text-slate-200",
            )}
          >
            <span>{isDirection ? "Down" : "No"}</span>
            <span className="font-mono text-sm font-black">{Math.max(1, 100 - activePricePct)}¢</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* MODE 1: MARKET ORDER VIEW                                    */}
        {/* ============================================================ */}
        {orderType === "market" && (
          <div className="space-y-4 pt-2">
            {/* When tab === 'buy': Amount Input */}
            {tab === "buy" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Amount</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-3xl font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={marketAmount === 0 ? "" : marketAmount}
                      onChange={(e) => setMarketAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      className="w-28 bg-transparent text-right font-mono text-3xl font-bold text-white placeholder:text-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Add Buttons: +$1, +$5, +$10, +$100 */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {[1, 5, 10, 100].map((inc) => (
                    <button
                      key={inc}
                      type="button"
                      onClick={() => setMarketAmount((prev) => prev + inc)}
                      className="rounded-xl border border-white/5 bg-[#1B2233] hover:bg-[#263047] hover:border-white/15 px-3 py-1.5 font-mono text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      +${inc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* When tab === 'sell': Shares Input */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Shares</span>
                  <input
                    type="number"
                    value={marketShares === 0 ? "" : marketShares}
                    onChange={(e) => setMarketShares(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-32 bg-transparent text-right font-mono text-3xl font-bold text-white placeholder:text-slate-500 outline-none"
                  />
                </div>

                {/* Quick Percentage Buttons: 25%, 50%, 75%, Max */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  {["25%", "50%", "75%", "Max"].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        if (pct === "25%") setMarketShares(25);
                        if (pct === "50%") setMarketShares(50);
                        if (pct === "75%") setMarketShares(75);
                        if (pct === "Max") setMarketShares(100);
                      }}
                      className="rounded-xl border border-white/5 bg-[#1B2233] hover:bg-[#263047] hover:border-white/15 px-3 py-1.5 font-mono text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      {pct}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 2: LIMIT ORDER VIEW                                     */}
        {/* ============================================================ */}
        {orderType === "limit" && (
          <div className="space-y-3.5 pt-2">
            {/* 1. Limit Price Stepper */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Limit price</span>
              <div className="flex items-center rounded-xl border border-white/10 bg-[#161D2F] p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setLimitPriceCents((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Decrease price"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <div className="min-w-[56px] text-center font-mono text-sm font-extrabold text-white px-2">
                  {limitPriceCents}¢
                </div>

                <button
                  type="button"
                  onClick={() => setLimitPriceCents((prev) => Math.min(99, prev + 1))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Increase price"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 2. Shares Input Box */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">Shares</span>
              <div className="flex items-center justify-end rounded-xl border border-white/10 bg-[#161D2F] px-4 py-2 w-32 shadow-inner focus-within:border-blue-500">
                <input
                  type="number"
                  value={limitShares === 0 ? "" : limitShares}
                  onChange={(e) => setLimitShares(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  placeholder="0"
                  className="w-full bg-transparent text-right font-mono text-base font-extrabold text-white placeholder:text-slate-500 outline-none"
                />
              </div>
            </div>

            {/* 3. Stepper Pills or Percentage Pills */}
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
              {tab === "buy" ? (
                [-100, -10, 10, 50, 100].map((stepVal) => (
                  <button
                    key={stepVal}
                    type="button"
                    onClick={() => setLimitShares((prev) => Math.max(0, prev + stepVal))}
                    className="rounded-xl border border-white/5 bg-[#1B2233] hover:bg-[#263047] hover:border-white/15 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {stepVal > 0 ? `+${stepVal}` : stepVal}
                  </button>
                ))
              ) : (
                ["25%", "50%", "75%", "Max"].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      if (pct === "25%") setLimitShares(25);
                      if (pct === "50%") setLimitShares(50);
                      if (pct === "75%") setLimitShares(75);
                      if (pct === "Max") setLimitShares(100);
                    }}
                    className="rounded-xl border border-white/5 bg-[#1B2233] hover:bg-[#263047] hover:border-white/15 px-3 py-1.5 font-mono text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    {pct}
                  </button>
                ))
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.08] pt-3 space-y-2.5">
              {/* 4. Expires Dropdown */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">Expires</span>
                <div ref={expirationRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsExpirationDropdownOpen(!isExpirationDropdownOpen)}
                    className="flex items-center gap-1 font-semibold text-slate-300 hover:text-white cursor-pointer"
                  >
                    <span>{expiration}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>

                  {isExpirationDropdownOpen && (
                    <div className="absolute right-0 bottom-full mb-1 w-28 overflow-hidden rounded-xl border border-white/10 bg-[#161D2F] p-1 shadow-2xl z-20 animate-in fade-in duration-100">
                      {["Never", "1 Hour", "6 Hours", "1 Day", "7 Days"].map((exp) => (
                        <button
                          key={exp}
                          type="button"
                          onClick={() => {
                            setExpiration(exp);
                            setIsExpirationDropdownOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-start rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                            expiration === exp ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/5",
                          )}
                        >
                          {exp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Total & Return Calculation */}
              {tab === "buy" ? (
                <>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-400">Total</span>
                    <span className="font-mono text-sm font-bold text-[#3B82F6]">
                      ${limitTotalDollars.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>To win</span>
                      <Info className="h-3 w-3 text-slate-500" />
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-400">
                      <span>💵</span>
                      <span>${limitToWinDollars.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>You&apos;ll receive</span>
                    <Info className="h-3 w-3 text-slate-500" />
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-400">
                    <span>💵</span>
                    <span>${limitYouReceiveDollars.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trade Error Alert */}
        {tradeError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/15 p-3 text-xs font-bold text-rose-300 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="flex-1">{tradeError}</span>
            {tradeError.includes("deposit") || tradeError.includes("balance") ? (
              <button
                type="button"
                onClick={() => setDepositOpen(true)}
                className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-500 transition-colors"
              >
                Deposit
              </button>
            ) : null}
          </div>
        )}

        {/* Success Alert */}
        {showSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-2.5 text-xs font-bold text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Order Placed Successfully! Check your Portfolio.</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* BIG BLUE TRADE ACTION BUTTON                                 */}
        {/* ============================================================ */}
        <div className="pt-2">
          <button
            type="button"
            disabled={
              isSubmitting ||
              (orderType === "market"
                ? (tab === "buy" ? marketAmount <= 0 : marketShares <= 0)
                : limitShares <= 0)
            }
            onClick={handleExecuteTrade}
            className={cn(
              "flex h-12 w-full items-center justify-center rounded-2xl text-sm font-extrabold text-white transition-all cursor-pointer active:scale-[0.98]",
              (orderType === "market"
                ? (tab === "buy" ? marketAmount > 0 : marketShares > 0)
                : limitShares > 0)
                ? "bg-[#3B82F6] hover:bg-[#2563EB] shadow-lg shadow-blue-600/30"
                : "bg-blue-600/40 text-white/50 cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processing Trade...</span>
              </span>
            ) : (
              <span>Trade</span>
            )}
          </button>
        </div>
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
      />
    </div>
  );
}

export default PolymarketTradeBox;
