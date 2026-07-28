'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Share2,
  BadgeCheck,
  Clock,
  ExternalLink,
  Bell,
  X,
} from 'lucide-react'
import { type Market, SOURCES, MARKETS } from '@/lib/retropick-data'
import { MiniChart } from '../mini-chart'
import { MarketCard } from '../market-card'
import { cn } from '@/lib/utils'

const RANGES = ['1H', '6H', '1D', '1W', '1M', 'ALL']

export function MarketDetail({
  market,
  balance,
  onBack,
  onTrade,
  onExecuteTrade,
  onSetAlert,
}: {
  market: Market
  balance: number
  onBack: () => void
  onTrade: (side: 'yes' | 'no') => void
  onExecuteTrade: (outcomeLabel: string, percentage: number, amount: number) => void
  onSetAlert?: (marketId: string, question: string, percentage: number) => void
}) {
  const [range, setRange] = useState('1D')
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number>(0)
  const [tradeAmount, setTradeAmount] = useState<string>('10')
  const [starred, setStarred] = useState(false)
  
  // Trades success state
  const [showSuccess, setShowSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  // Alerts modal states
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertPercentage, setAlertPercentage] = useState('80')
  const [alertCreatedToast, setAlertCreatedToast] = useState(false)

  const up = market.trend === 'up'

  // Calculate pricing dynamically based on market type & user choices
  let price = market.yes
  let label = 'Yes'

  if (market.options && market.options.length > 0) {
    const currentOption = market.options[selectedOptionIdx]
    if (currentOption) {
      price = currentOption.percentage
      label = currentOption.label
    }
  } else {
    price = tradeSide === 'yes' ? market.yes : 100 - market.yes
    label = tradeSide === 'yes' ? 'Yes / Up' : 'No / Down'
  }

  const numAmount = parseFloat(tradeAmount) || 0
  const sharePrice = price / 100
  const shares = sharePrice > 0 ? (numAmount / sharePrice).toFixed(1) : '0.0'
  const payout = numAmount > 0 ? (numAmount / sharePrice).toFixed(2) : '0.00'
  const profitPercentage = price > 0 ? Math.round(((100 - price) / price) * 100) : 0

  const assetName = market.icon ? `${market.icon}/USD` : 'Market/USD'
  const displayPrice = `${price}%`

  const handlePlaceTrade = () => {
    setErrorMsg('')
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount')
      return
    }
    if (numAmount > balance) {
      setErrorMsg(`Insufficient balance. You have ${balance} USDC`)
      return
    }

    onExecuteTrade(label, price, numAmount)
    setSuccessDetails(`Successfully purchased ${shares} shares of "${label}" for ${numAmount} USDC.`)
    setShowSuccess(true)
  }

  const handleSaveAlert = () => {
    const pct = parseInt(alertPercentage) || 80
    if (onSetAlert) {
      onSetAlert(market.id, market.question, pct)
    }
    setShowAlertModal(false)
    setAlertCreatedToast(true)
    setTimeout(() => setAlertCreatedToast(false), 3000)
  }

  return (
    <div className="relative flex h-full flex-col bg-background">
      {/* Success Modal Overlay */}
      {showSuccess && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-6 animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-primary/20 bg-card p-6 text-center space-y-4 shadow-2xl animate-scale-up">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yes/15 text-yes text-3xl animate-bounce">
              🎉
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-foreground">Trade Successful!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{successDetails}</p>
            </div>
            <button
              onClick={() => {
                setShowSuccess(false)
                onBack() // Navigate back to feed
              }}
              className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Set Alert Modal Overlay */}
      {showAlertModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-6 animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 relative space-y-4 shadow-2xl animate-scale-up">
            <button 
              onClick={() => setShowAlertModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <div className="text-center space-y-1.5 pb-1 border-b border-border/40">
              <h3 className="text-sm font-black text-foreground">Set Price Alert</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">We will trigger a notification when the odds hit your target</p>
            </div>
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted-foreground">Target Probability (%)</label>
                <div className="flex items-center gap-2 mt-1.5 bg-secondary/15 rounded-lg border border-border px-3 py-2">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={alertPercentage}
                    onChange={(e) => setAlertPercentage(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold text-foreground outline-none"
                    placeholder="80"
                  />
                  <span className="text-xs font-bold text-muted-foreground shrink-0">%</span>
                </div>
              </div>
              <button
                onClick={handleSaveAlert}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Save Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating success toast in detail page */}
      {alertCreatedToast && (
        <div className="absolute top-16 left-4 right-4 z-40 rounded-xl border border-yes/20 bg-yes-soft/90 p-3 text-center shadow-lg backdrop-blur-sm animate-slide-down">
          <p className="text-[11px] font-bold text-yes">🔔 Alert saved! Target set to {alertPercentage}% probability.</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <button onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">Market Detail</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAlertModal(true)}
            aria-label="Set alert"
            className="text-foreground hover:text-primary transition-colors active:scale-[0.93]"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setStarred(!starred)} 
            aria-label="Bookmark"
            className={cn("transition-colors", starred ? "text-yellow" : "text-foreground")}
          >
            <Bookmark className={cn("h-5 w-5", starred ? "fill-yellow" : "")} />
          </button>
          <button aria-label="Share">
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-5 py-2">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-primary font-bold">Markets</span>
          {' › '}
          <span className="text-primary font-bold">{market.category}</span>
          {' › '}
          <span className="text-foreground">{market.question.substring(0, 30)}...</span>
        </p>
      </div>

      {/* Scrollable content */}
      <div className="no-scrollbar flex-1 overflow-y-auto pb-24">
        {/* Category and Title */}
        <div className="border-b border-border bg-card px-5 py-3.5">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              {market.category}
            </span>
          </div>
          <h1 className="mt-2 font-display text-lg font-bold leading-snug text-foreground">
            {market.question}
          </h1>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>📊 {market.volume} Vol</span>
            <span>👥 {market.participants}</span>
            <span>⏱️ {market.timeLeft}</span>
          </div>
        </div>

        {/* All Content - Single Scrollable Page */}
        <div className="px-5 py-4 space-y-6">
          {/* Market Stats Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[10px] border border-border bg-secondary/30 p-3">
              <p className="text-[10px] text-muted-foreground">Start Date</p>
              <p className="mt-1 text-sm font-semibold text-foreground">25/07/2026</p>
            </div>
            <div className="rounded-[10px] border border-border bg-secondary/30 p-3">
              <p className="text-[10px] text-muted-foreground">End Date</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{market.timeLeft.replace('Ends ', '') || '31/12/2026'}</p>
            </div>
            <div className="rounded-[10px] border border-border bg-secondary/30 p-3">
              <p className="text-[10px] text-muted-foreground">24h Volume</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {market.volume.includes('m') 
                  ? `$${(parseFloat(market.volume.replace(/[^\d.]/g, '')) * 0.1).toFixed(1)}m`
                  : `$${(parseFloat(market.volume.replace(/[^\d.]/g, '')) * 0.1).toFixed(0)}k`
                }
              </p>
            </div>
            <div className="rounded-[10px] border border-border bg-secondary/30 p-3">
              <p className="text-[10px] text-muted-foreground">Total Volume</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{market.volume}</p>
            </div>
          </div>

          {/* Large Chart Section */}
          <section className="rounded-[12px] border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{assetName}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-black text-foreground">{displayPrice}</p>
                  <p className={`text-sm font-semibold ${up ? 'text-yes' : 'text-no'}`}>
                    {up ? '↑' : '↓'} {up ? '+' : '-'}{Math.abs(price - 50)}% 24h
                  </p>
                </div>
              </div>
            </div>
            <MiniChart
              data={market.chart}
              up={up}
              tone="brand"
              width={320}
              height={180}
              strokeWidth={2.5}
              className="w-full"
            />
            <div className="mt-4 grid grid-cols-6 gap-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-[6px] py-1.5 text-[9px] font-semibold transition-colors active:scale-[0.96]",
                    range === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Custom Dynamic Trade Panel */}
          <section className="rounded-[12px] border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Place Trade</h3>
              <span className="text-[10px] text-muted-foreground">
                Balance: <strong className="text-foreground">{balance.toFixed(2)} USDC</strong>
              </span>
            </div>

            {/* Selection Selector */}
            {market.options && market.options.length > 0 ? (
              // Multi-Option Selector (Multiple Choice, Range, Ladder, Velocity, Date, Convergence)
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
                {market.options.map((opt, idx) => {
                  const isSelected = selectedOptionIdx === idx
                  return (
                    <button
                      key={opt.label}
                      onClick={() => setSelectedOptionIdx(idx)}
                      className={cn(
                        "w-full flex items-center justify-between rounded-[8px] border px-3 py-2 text-xs font-bold transition-all",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary scale-[1.01]"
                          : "border-border bg-secondary/10 text-foreground hover:bg-secondary/20"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className="shrink-0">{opt.percentage}¢</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              // Yes / No (Direction/Threshold) side-by-side selectors
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTradeSide('yes')}
                  className={cn(
                    "flex flex-col items-center rounded-[10px] border py-2.5 transition-all",
                    tradeSide === 'yes'
                      ? "border-yes bg-yes/15 text-yes font-bold scale-[1.02]"
                      : "border-border bg-secondary/10 text-muted-foreground hover:bg-secondary/20"
                  )}
                >
                  <span className="text-xs font-semibold">Yes / Up</span>
                  <span className="text-lg font-black mt-0.5">{market.yes}¢</span>
                </button>
                <button
                  onClick={() => setTradeSide('no')}
                  className={cn(
                    "flex flex-col items-center rounded-[10px] border py-2.5 transition-all",
                    tradeSide === 'no'
                      ? "border-no bg-no/15 text-no font-bold scale-[1.02]"
                      : "border-border bg-secondary/10 text-muted-foreground hover:bg-secondary/20"
                  )}
                >
                  <span className="text-xs font-semibold">No / Down</span>
                  <span className="text-lg font-black mt-0.5">{100 - market.yes}¢</span>
                </button>
              </div>
            )}

            {/* Trading box containing inputs */}
            <div className="space-y-3 pt-2.5 border-t border-border/40">
              <div className="flex items-center justify-between gap-3 bg-secondary/10 rounded-[10px] border border-border px-3.5 py-2.5">
                <div className="flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Amount (USDC)</p>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="w-full bg-transparent text-lg font-black text-foreground outline-none mt-0.5"
                    placeholder="0"
                  />
                </div>
                <span className="text-sm font-bold text-muted-foreground shrink-0">USDC</span>
              </div>

              {/* Quick selectors */}
              <div className="grid grid-cols-5 gap-1.5">
                {['10', '25', '50', '100', 'MAX'].map((val) => (
                  <button
                    key={val}
                    onClick={() => setTradeAmount(val === 'MAX' ? balance.toFixed(0) : val)}
                    className="rounded-[6px] border border-border bg-card hover:bg-secondary py-1 text-xs font-semibold text-muted-foreground active:scale-[0.97] transition-all"
                  >
                    {val}
                  </button>
                ))}
              </div>

              {/* Error message */}
              {errorMsg && (
                <p className="text-xs font-semibold text-no px-1 animate-pulse">{errorMsg}</p>
              )}

              {/* Cost stats */}
              <div className="bg-secondary/5 rounded-lg border border-border/40 p-3 space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Price per share</span>
                  <span className="font-bold text-foreground">{price}¢</span>
                </div>
                <div className="flex justify-between">
                  <span>Shares to receive</span>
                  <span className="font-bold text-foreground">{shares}</span>
                </div>
                <div className="flex justify-between">
                  <span>Potential Payout</span>
                  <span className="font-bold text-yes">${payout} ({profitPercentage}%)</span>
                </div>
              </div>

              {/* Big Trade Button */}
              <button
                onClick={handlePlaceTrade}
                className={cn(
                  "w-full rounded-[12px] py-3 text-sm font-bold text-white shadow-md transition-all active:scale-[0.99]",
                  market.options && market.options.length > 0
                    ? "bg-primary shadow-primary/20"
                    : tradeSide === 'yes'
                      ? "bg-yes shadow-yes/20"
                      : "bg-no shadow-no/20"
                )}
              >
                Buy &apos;{label.substring(0, 20)}&apos; Outcome
              </button>
            </div>
          </section>

          {/* Market Outcomes */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">Market Outcomes</h3>
            <div className="space-y-2">
              {market.options && market.options.length > 0 ? (
                market.options.map((opt, idx) => (
                  <div
                    key={opt.label}
                    onClick={() => setSelectedOptionIdx(idx)}
                    className={cn(
                      "flex items-center justify-between rounded-[10px] border bg-card p-3 cursor-pointer transition-all active:scale-[0.99]",
                      selectedOptionIdx === idx ? "border-primary bg-primary/5" : "border-border bg-card"
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-sm font-bold text-primary">{opt.percentage}%</span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-[10px] border border-border bg-card p-3">
                    <span className="text-sm font-semibold text-foreground">Yes / Up</span>
                    <span className="text-sm font-bold text-primary">{market.yes}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[10px] border border-border bg-card p-3">
                    <span className="text-sm font-semibold text-foreground">No / Down</span>
                    <span className="text-sm font-bold text-primary">{100 - market.yes}%</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Resolution Rules Section */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">Resolution Rules</h3>
            <p className="rounded-[10px] border border-border bg-card p-3 text-[12px] leading-relaxed text-muted-foreground">
              This market resolves to the final outcome verified by trusted real-world data sources at the end date. Calculations are based on market rules, and shares resolve to 100¢ (1.00 USDC) for the winning outcome, and 0¢ for all losing outcomes.
            </p>
          </section>

          {/* Verified Sources Section */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">Verified Sources</h3>
            <div className="space-y-2">
              {SOURCES.map((s) => (
                <div
                  key={s.name}
                  className="flex w-full items-center justify-between rounded-[10px] border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.time}</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </section>

          {/* Related Markets Section */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-foreground">Related Markets</h3>
            <div className="space-y-2">
              {MARKETS.filter(
                (m) => m.category === market.category && m.id !== market.id,
              )
                .slice(0, 3)
                .map((m) => (
                  <MarketCard key={m.id} market={m} variant="compact" />
                ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
