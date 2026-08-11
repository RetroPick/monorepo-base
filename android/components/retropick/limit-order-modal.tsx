"use client"

import React, { useState } from "react"
import { X, ChevronDown, Info, DollarSign, Plus, Minus } from "lucide-react"

interface LimitOrderModalProps {
  isOpen: boolean
  onClose: () => void
  marketTitle?: string
  imageUrl?: string
  initialOutcome?: string
  initialSide?: "BUY" | "SELL"
  initialPriceCents?: number
  onTradeSubmit?: (tradeDetails: {
    side: "BUY" | "SELL"
    type: "LIMIT" | "MARKET"
    outcome: string
    limitPriceCents: number
    shares: number
    totalCost: number
    toWin: number
  }) => void
}

export function LimitOrderModal({
  isOpen,
  onClose,
  marketTitle = "Clarity Act (H.R.3633) signed into law in 2026?",
  imageUrl = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=100&auto=format&fit=crop&q=60",
  initialOutcome = "YES",
  initialSide = "BUY",
  initialPriceCents = 18,
  onTradeSubmit
}: LimitOrderModalProps) {
  const [side, setSide] = useState<"BUY" | "SELL">(initialSide)
  const [orderType, setOrderType] = useState<"LIMIT" | "MARKET">("LIMIT")
  const [outcome, setOutcome] = useState<string>(initialOutcome)
  const [limitPriceCents, setLimitPriceCents] = useState<number>(initialPriceCents)
  const [shares, setShares] = useState<number>(300)
  const [expiration, setExpiration] = useState<string>("Never")

  // Sync state when props change
  React.useEffect(() => {
    setOutcome(initialOutcome)
  }, [initialOutcome])

  React.useEffect(() => {
    if (initialPriceCents) setLimitPriceCents(initialPriceCents)
  }, [initialPriceCents])

  // Prevent background scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  // Financial calculations
  const priceDollars = limitPriceCents / 100
  const totalCost = Number((priceDollars * shares).toFixed(2))
  // To win = potential payout ($1 per share) minus cost
  const potentialPayout = shares * 1.0
  const toWin = Number((potentialPayout - totalCost).toFixed(2))

  const handleSharesIncrement = (delta: number) => {
    setShares(prev => Math.max(1, prev + delta))
  }

  const handlePriceStep = (deltaCents: number) => {
    setLimitPriceCents(prev => Math.max(1, Math.min(99, prev + deltaCents)))
  }

  const handleSubmit = () => {
    if (onTradeSubmit) {
      onTradeSubmit({
        side,
        type: orderType,
        outcome,
        limitPriceCents,
        shares,
        totalCost,
        toWin
      })
    }
    onClose()
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-[2px] animate-fade-in p-0">
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Full-width edge-to-edge Bottom Sheet Drawer container sitting flush on top of BottomNav */}
      <div className="relative z-10 w-full mb-[92px] bg-[#121722]/98 backdrop-blur-md text-white rounded-t-3xl rounded-b-none border-t border-slate-700/80 shadow-2xl overflow-hidden font-sans max-h-[calc(85vh-92px)] overflow-y-auto animate-in slide-in-from-bottom duration-300 ease-out">
        
        {/* Grab Handle Pill */}
        <div className="w-12 h-1 bg-slate-600/60 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer" onClick={onClose} />

        {/* Header with Close */}
        <div className="p-4 border-b border-slate-800/60 flex items-start gap-3 relative">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-slate-700/50">
            <img
              src={imageUrl}
              alt="Market"
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/logo.webp'
              }}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="text-sm font-medium text-slate-200 line-clamp-1 leading-snug">
              {marketTitle}
            </h3>
            <span className={`text-xs font-semibold ${outcome === "YES" ? "text-emerald-400" : "text-rose-400"}`}>
              {outcome === "YES" ? "Yes" : "No"}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          
          {/* Buy / Sell Tabs & Order Type Dropdown */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => setSide("BUY")}
                className={`pb-1 text-sm font-semibold transition relative ${
                  side === "BUY" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Buy
                {side === "BUY" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
              <button
                onClick={() => setSide("SELL")}
                className={`pb-1 text-sm font-semibold transition relative ${
                  side === "SELL" ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sell
                {side === "SELL" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            </div>

            <div className="relative">
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as "LIMIT" | "MARKET")}
                className="appearance-none bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 py-1 pl-3 pr-7 rounded-lg cursor-pointer focus:outline-none focus:border-slate-700"
              >
                <option value="LIMIT">Limit</option>
                <option value="MARKET">Market</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Outcome Buttons: Yes vs No */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOutcome("YES")}
              className={`py-3 px-4 rounded-xl flex items-center justify-between font-bold text-base transition border ${
                outcome === "YES"
                  ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                  : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>Yes</span>
              <span>15¢</span>
            </button>
            <button
              onClick={() => setOutcome("NO")}
              className={`py-3 px-4 rounded-xl flex items-center justify-between font-bold text-base transition border ${
                outcome === "NO"
                  ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-950/40"
                  : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>No</span>
              <span>86¢</span>
            </button>
          </div>

          {/* Limit Price Stepper */}
          {orderType === "LIMIT" && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-slate-300">Limit price</span>
              <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => handlePriceStep(-1)}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-4 py-2 font-bold text-base text-white min-w-[60px] text-center">
                  {limitPriceCents}¢
                </span>
                <button
                  onClick={() => handlePriceStep(1)}
                  className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Shares Input & Quick Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Shares</span>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-32 bg-slate-900/90 border border-slate-800 text-right text-base font-bold text-white px-3 py-1.5 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Incremental pill chips */}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              {[-100, -10, 10, 20, 100].map((delta) => (
                <button
                  key={delta}
                  onClick={() => handleSharesIncrement(delta)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                    delta === 20
                      ? "bg-indigo-950/80 border-indigo-700 text-indigo-300 hover:bg-indigo-900"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>

            {/* Liquidity matching indicator */}
            <div className="flex justify-end pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-900/80 rounded-full text-xs font-medium text-emerald-400">
                <Info className="w-3 h-3 text-emerald-400" />
                <span>{shares}.00 matching</span>
              </div>
            </div>
          </div>

          {/* Expires Dropdown */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-400">Expires</span>
            <div className="relative">
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="appearance-none bg-transparent text-slate-300 font-medium pr-5 text-xs text-right cursor-pointer focus:outline-none"
              >
                <option value="Never" className="bg-slate-900">Never</option>
                <option value="24h" className="bg-slate-900">24 Hours</option>
                <option value="7d" className="bg-slate-900">7 Days</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Financial Summary: Total & To Win */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-slate-300">Total</span>
              <span className="text-sky-400 font-bold text-base">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-medium">
              <div className="flex items-center gap-1 text-slate-300">
                <span>To win</span>
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-base">
                <span>💵</span>
                <span>${toWin.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Trade Button */}
          <button
            onClick={handleSubmit}
            className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-bold text-base rounded-xl transition shadow-lg shadow-sky-950/50 mt-2"
          >
            Trade
          </button>

        </div>
      </div>
    </div>
  )
}
