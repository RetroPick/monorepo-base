'use client'

import { useState, useRef } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Bell,
  X,
  Clock,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Tag,
  CheckCircle2,
  Info,
  ShieldCheck,
  Globe,
  ArrowUpRight,
} from 'lucide-react'
import { type Market, SOURCES, MARKETS, getSafeMarketImage, getOptionThumbnail } from '@/lib/retropick-data'
import { extractSubTags, getDetailedMarketRules } from '@/lib/polymarket-service'
import { DetailChart } from '../detail-chart'
import { cn } from '@/lib/utils'

const RANGES = ['1d', '1w', '1m', 'All']

function getMarketDescription(market: Market): string {
  if (market.description) return market.description

  if (market.marketType === 'UP_OR_DOWN') {
    return `This directional market resolves to "Yes" if outcome conditions for "${market.question}" are verified true by official settlement reports. Resolution is based on primary data feeds before ${market.timeLeft}. Total 24H volume is ${market.volume} with ${market.participants} active traders.`
  }
  
  if (market.options && market.options.length > 0) {
    return `This multiple choice market covers "${market.question}". Resolution criteria require official announcement confirming the winning option. Each winning share pays out $1.00 USDC upon resolution.`
  }

  return `This market resolves according to primary official verification sources for "${market.question}". Resolution occurs upon market settlement with ${market.timeLeft} remaining. Total volume traded is ${market.volume}.`
}

function getResolutionDomain(market: Market): string {
  const cat = market.category
  const q = market.question.toLowerCase()

  if (cat === 'Crypto' || q.includes('btc') || q.includes('eth') || q.includes('sol')) {
    return 'data.chain.link'
  }
  if (cat === 'Economics' || cat === 'Stocks' || cat === 'Finance' || q.includes('fed') || q.includes('rate')) {
    return 'federalreserve.gov'
  }
  if (cat === 'AI' || q.includes('openai') || q.includes('gpt')) {
    return 'openai.com'
  }
  if (cat === 'Sports' || q.includes('score') || q.includes('fc')) {
    return 'official.scoreboard.org'
  }
  return 'polymarket.com'
}

function isTransparentLogoAsset(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  if (lower.endsWith('.svg')) return true
  if (
    lower.includes('apple') ||
    lower.includes('google') ||
    lower.includes('twitter') ||
    lower.includes('telegram') ||
    lower.includes('metamask') ||
    lower.includes('prvaliga') ||
    lower.includes('soccer')
  ) {
    return true
  }
  return false
}

function MarketDetailImage({ market }: { market: Market }) {
  const src = getSafeMarketImage(market)
  const isTransparent = isTransparentLogoAsset(src)

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-400/40 dark:border-zinc-600/60 bg-slate-300/80 dark:bg-zinc-700/90 p-1 shadow-2xs">
      <img
        src={src}
        alt=""
        suppressHydrationWarning
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = '/logo.webp'
        }}
        className={cn(
          "h-full w-full rounded-lg transition-transform",
          isTransparent ? "bg-white object-contain p-0.5" : "object-cover"
        )}
      />
    </div>
  )
}

export function MarketDetail({
  market,
  balance,
  positions = [],
  sourceCategory,
  onBack,
  onTrade,
  onExecuteTrade,
  onSetAlert,
  onSelectMarket,
}: {
  market: Market
  balance: number
  positions?: any[]
  sourceCategory?: string
  onBack: () => void
  onTrade?: (side: 'yes' | 'no') => void
  onExecuteTrade: (outcomeLabel: string, percentage: number, amount: number) => void
  onSetAlert?: (marketId: string, question: string, percentage: number) => void
  onSelectMarket?: (m: Market) => void
}) {
  const [range, setRange] = useState('1d')
  const [tradeSide, setTradeSide] = useState<'yes' | 'no'>('yes')
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number>(0)
  const [tradeAmount, setTradeAmount] = useState<string>('10')
  const [starred, setStarred] = useState(false)

  // Dynamic Parent Label for Breadcrumb (e.g. Trending > Title or Crypto > Title)
  const parentLabel = sourceCategory || market.category || 'Trending'

  // Trades success state
  const [showSuccess, setShowSuccess] = useState(false)
  const [successDetails, setSuccessDetails] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  // Alerts modal states
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertPercentage, setAlertPercentage] = useState('80')
  const [alertCreatedToast, setAlertCreatedToast] = useState(false)

  // Share Deep Link Toast state (NAVIGATION_AND_DEEP_LINKS.md)
  const [shareToast, setShareToast] = useState(false)

  const handleShareMarket = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/?market=${market.id}`
      navigator.clipboard.writeText(shareUrl)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 3000)
    }
  }

  const up = market.trend === 'up'

  // Calculate pricing dynamically
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
    label = tradeSide === 'yes' ? 'Up' : 'Down'
  }

  const numAmount = parseFloat(tradeAmount) || 0
  const sharePrice = price / 100
  const shares = sharePrice > 0 ? (numAmount / sharePrice).toFixed(1) : '0.0'
  const payout = numAmount > 0 ? (numAmount / sharePrice).toFixed(2) : '0.00'
  const returnPct = sharePrice > 0 ? Math.round(((1 - sharePrice) / sharePrice) * 100) : 0

  const handlePlaceTrade = () => {
    setErrorMsg('')
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid amount')
      return
    }
    if (numAmount > balance) {
      setErrorMsg(`Insufficient balance. You have $${balance.toFixed(2)} USDC`)
      return
    }

    onExecuteTrade(label, price, numAmount)
    setSuccessDetails(`Bought ${shares} shares of "${label}" for $${numAmount.toFixed(2)} USDC`)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3200)
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

  // Find user's active positions for this market
  const myPositions = positions.filter((p) => p.question === market.question || p.id === market.id)

  // Extract EXACTLY 1 specific Sub-Tag (e.g. Soccer, Baseball, BTC, Asset Management, EV, OpenAI, F1, NFL)
  const freshSubTags = extractSubTags(market.question, market.category)
  const singleSubTag = freshSubTags.find((t) => t !== market.category) || null

  // Relevant Category & Single Sub-Topic Tags
  const tags = [
    market.category,
    ...(singleSubTag ? [singleSubTag] : []),
    market.marketType.replace('_', ' '),
    `${market.volume} Vol`,
    'Verified',
  ]

  return (
    <div className="relative flex flex-col h-full bg-background animate-fade-up px-4 pb-36 pt-3 space-y-4 text-foreground overflow-y-auto min-h-0 no-scrollbar">
      {/* Floating Non-blocking Toast Notification Banner */}
      {showSuccess && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-fade-down">
          <div className="flex items-center gap-3 rounded-2xl border border-yes/40 bg-card/98 p-3.5 shadow-2xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yes/20 text-yes font-black text-sm">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-foreground">Order Executed Successfully</h4>
              <p className="text-[11px] text-muted-foreground truncate">{successDetails}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowSuccess(false)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4 stroke-[2px]" />
            </button>
          </div>
        </div>
      )}

      {/* Set Alert Modal Overlay */}
      {showAlertModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-5 animate-fade-in">
          <div className="w-full max-w-xs rounded-xl border border-border bg-card p-5 relative space-y-3 shadow-2xl">
            <button 
              onClick={() => setShowAlertModal(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 stroke-[2px]" />
            </button>
            <div className="text-center space-y-0.5 pb-2 border-b border-border/40">
              <h3 className="text-xs font-bold text-foreground">Set Price Alert</h3>
              <p className="text-[10px] text-muted-foreground">Notification triggers at target probability</p>
            </div>
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Probability (%)</label>
                <div className="flex items-center gap-2 mt-1 bg-secondary/20 rounded-md border border-border px-3 py-1.5">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={alertPercentage}
                    onChange={(e) => setAlertPercentage(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-foreground outline-none"
                    placeholder="80"
                  />
                  <span className="text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>
              <button
                onClick={handleSaveAlert}
                className="w-full rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Save Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert toast */}
      {alertCreatedToast && (
        <div className="absolute top-12 left-4 right-4 z-40 rounded-md border border-yes/30 bg-yes-soft p-2.5 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs font-bold text-yes">🔔 Target alert saved for {alertPercentage}% probability.</p>
        </div>
      )}

      {/* Share Deep Link toast */}
      {shareToast && (
        <div className="absolute top-12 left-4 right-4 z-40 rounded-md border border-primary/40 bg-primary/10 p-2.5 text-center shadow-lg backdrop-blur-sm border-t">
          <p className="text-xs font-bold text-primary">🔗 Market deep link copied to clipboard!</p>
        </div>
      )}

      {/* 1. Breadcrumb Bar */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2px]" />
          </button>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground truncate">
            <span className="text-primary font-bold">{parentLabel}</span>
            <span>&gt;</span>
            <span className="text-foreground truncate max-w-[180px]">{market.question}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShareMarket}
            aria-label="Share market deep link"
            className="text-muted-foreground hover:text-primary transition-colors active:scale-95 p-1"
          >
            <Share2 className="h-3.5 w-3.5 stroke-[2px]" />
          </button>
          <button
            onClick={() => setShowAlertModal(true)}
            aria-label="Set alert"
            className="text-muted-foreground hover:text-primary transition-colors active:scale-95 p-1"
          >
            <Bell className="h-3.5 w-3.5 stroke-[2px]" />
          </button>
          <button 
            onClick={() => setStarred(!starred)} 
            aria-label="Bookmark"
            className={cn("transition-colors active:scale-95 p-1", starred ? "text-primary" : "text-muted-foreground")}
          >
            <Bookmark className={cn("h-3.5 w-3.5 stroke-[2px]", starred ? "fill-primary" : "")} />
          </button>
        </div>
      </div>

      {/* 3. Header Row: Image + Title + Tag Pills */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 min-h-[44px]">
          <MarketDetailImage market={market} />
          <div className="min-w-0 flex-1 my-auto">
            <h1 className="font-display text-sm font-bold leading-snug text-foreground">
              {market.question}
            </h1>
          </div>
        </div>

        {/* Tag Pills & Catalog Freshness Status (ANDROID_MARKETS.md Section 9) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-yes/30 bg-yes/10 px-2 py-0.5 text-[10px] font-bold text-yes">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yes opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yes"></span>
            </span>
            Live • Freshness Verified
          </span>
          {tags.map((t, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >
              <Tag className="h-2.5 w-2.5 stroke-[1.8px] text-primary" />
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* 4. 2x2 Stats Grid */}
      <div className="grid grid-cols-2 rounded-lg border border-border/80 bg-secondary/10 text-xs divide-x divide-y divide-border/60">
        {/* Start Date */}
        <div className="p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Clock className="h-3 w-3 stroke-[2px]" />
            <span>Start Date</span>
          </div>
          <p className="text-xs font-bold text-foreground">Jul 1, 2026</p>
        </div>

        {/* End Date */}
        <div className="p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Clock className="h-3 w-3 stroke-[2px]" />
            <span>Resolution Date</span>
          </div>
          <p className="text-xs font-bold text-foreground">{market.timeLeft}</p>
        </div>

        {/* 24h Volume */}
        <div className="p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <TrendingUp className="h-3 w-3 stroke-[2px]" />
            <span>24h Volume</span>
          </div>
          <p className="text-xs font-bold text-foreground">
            {market.volume}
          </p>
        </div>

        {/* Participants */}
        <div className="p-2.5 space-y-0.5">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <TrendingUp className="h-3 w-3 stroke-[2px]" />
            <span>Active Traders</span>
          </div>
          <p className="text-xs font-bold text-foreground">
            {market.participants}
          </p>
        </div>
      </div>

      {/* 5. CHART SECTION (Polymarket Precision Chart) */}
      <div className="space-y-2.5 rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black font-mono text-foreground">{price}%</span>
            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md border font-mono", up ? "bg-yes/15 text-yes border-yes/30" : "bg-no/15 text-no border-no/30")}>
              {up ? '↑ +4.2%' : '↓ -2.8%'} (24H)
            </span>
          </div>
        </div>

        {/* Enhanced Detail Chart with Y/X axis labels and timeframe pills */}
        <div className="w-full pt-1">
          <DetailChart 
            data={market.chart} 
            up={up} 
            range={range} 
            onRangeChange={setRange}
            height={190} 
          />
        </div>
      </div>

      {/* 5.5 ACTIVE POSITIONS CARD (If trader owns shares in this market) */}
      {myPositions.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <ShieldCheck className="h-4 w-4 text-primary stroke-[2.2px]" />
              Your Active Position
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
              {myPositions.length} {myPositions.length === 1 ? 'Position' : 'Positions'} Open
            </span>
          </div>
          <div className="divide-y divide-border/30 pt-0.5">
            {myPositions.map((pos, pIdx) => (
              <div key={pIdx} className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yes animate-pulse" />
                  {pos.side} ({pos.prob}¢)
                </span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold text-foreground">{pos.value}</span>
                  <span className="text-[10px] font-bold text-yes bg-yes/15 px-1.5 py-0.5 rounded border border-yes/30">
                    {pos.pnl || 'Open'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. UP / DOWN TRADING EXECUTION SECTION (Directly Below Chart) */}
      <div className="space-y-3.5 rounded-2xl border border-border/80 bg-card p-4 shadow-md">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Place Trade</h3>

        {/* Side Select Buttons */}
        {market.options && market.options.length > 0 ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Select Option</label>
            <div className="grid grid-cols-1 gap-1.5">
              {market.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOptionIdx(idx)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border p-3 text-xs font-bold transition-all text-left",
                    selectedOptionIdx === idx
                      ? "border-primary bg-primary/10 text-foreground shadow-xs"
                      : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {(() => {
                      const imgSrc = getOptionThumbnail(opt.label, market)
                      if (!imgSrc) return null
                      return (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md overflow-hidden shadow-2xs">
                          <img
                            src={imgSrc}
                            alt={opt.label}
                            suppressHydrationWarning
                            onError={(e) => {
                              e.currentTarget.onerror = null
                              e.currentTarget.src = '/logo.webp'
                            }}
                            className="h-full w-full rounded-md object-cover"
                          />
                        </div>
                      )
                    })()}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <span className="font-mono text-primary">{opt.percentage}% ({opt.percentage}¢)</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setTradeSide('yes')}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition-all text-left active:scale-[0.98]",
                tradeSide === 'yes'
                  ? "border-yes bg-yes/20 text-yes shadow-xs"
                  : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yes/20 text-yes font-black text-xs">↑</span>
                <span className="font-extrabold text-yes">Up</span>
              </div>
              <span className="rounded-md bg-yes/20 px-2 py-0.5 font-mono text-xs font-bold text-yes border border-yes/30">
                {market.yes}¢
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTradeSide('no')}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3.5 text-xs font-bold transition-all text-left active:scale-[0.98]",
                tradeSide === 'no'
                  ? "border-no bg-no/20 text-no shadow-xs"
                  : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-no/20 text-no font-black text-xs">↓</span>
                <span className="font-extrabold text-no">Down</span>
              </div>
              <span className="rounded-md bg-no/20 px-2 py-0.5 font-mono text-xs font-bold text-no border border-no/30">
                {100 - market.yes}¢
              </span>
            </button>
          </div>
        )}

        {/* Amount Input & Preset Chips */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>Amount (USDC)</span>
            <span>Balance: ${balance.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/20 px-3.5 py-2.5 focus-within:border-primary">
            <span className="text-xs font-bold text-muted-foreground">$</span>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-foreground outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex items-center gap-1.5 pt-1">
            {['10', '25', '50', '100'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTradeAmount(amt)}
                className="flex-1 rounded-lg border border-border/60 bg-secondary/30 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                +${amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTradeAmount(balance.toFixed(0))}
              className="flex-1 rounded-lg border border-primary/40 bg-primary/10 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
            >
              Max
            </button>
          </div>
        </div>

        {errorMsg && <p className="text-xs font-bold text-no">{errorMsg}</p>}

        {/* Payout Details */}
        <div className="rounded-xl bg-secondary/20 p-3 text-[11px] space-y-1.5 text-muted-foreground border border-border/40">
          <div className="flex justify-between">
            <span>Avg Share Price:</span>
            <span className="font-bold text-foreground font-mono">{price}¢</span>
          </div>
          <div className="flex justify-between">
            <span>Est. Shares:</span>
            <span className="font-bold text-foreground font-mono">{shares} shares</span>
          </div>
          <div className="flex justify-between border-t border-border/30 pt-1.5 font-semibold">
            <span>Est. Payout if Correct:</span>
            <span className="font-bold text-yes font-mono">${payout} USDC <span className="text-[10px] font-bold text-yes/90">(+{returnPct}%)</span></span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePlaceTrade}
          className={cn(
            "w-full rounded-xl py-3.5 text-xs font-extrabold shadow-md transition-all active:scale-[0.99]",
            (!market.options || market.options.length === 0)
              ? (tradeSide === 'yes'
                  ? "bg-yes text-yes-foreground hover:bg-yes/90 shadow-yes/20"
                  : "bg-no text-no-foreground hover:bg-no/90 shadow-no/20")
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
          )}
        >
          Buy {label}
        </button>
      </div>

      {/* 7. RELATED EVENTS SECTION (Matching Polymarket Image 3 - Placed Above Rules) */}
      <div className="space-y-2.5 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
          <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
            Related Events
          </h3>
          <span className="text-[10px] font-bold text-primary">
            {MARKETS.filter(m => m.id !== market.id).slice(0, 5).length} events
          </span>
        </div>

        <div className="divide-y divide-border/30">
          {MARKETS.filter(m => m.id !== market.id && (m.category === market.category || m.marketType === market.marketType))
            .concat(MARKETS.filter(m => m.id !== market.id))
            .slice(0, 5)
            .map((rm) => (
              <button
                key={rm.id}
                type="button"
                onClick={() => onSelectMarket && onSelectMarket(rm)}
                className="flex items-center justify-between py-2.5 w-full text-left transition-colors rounded-lg px-1 group cursor-pointer hover:bg-secondary/30"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                  <MarketDetailImage market={rm} />
                  <span className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {rm.question}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {rm.options?.[0]?.label || 'Yes'}
                  </span>
                  <span className="text-xs font-black font-mono text-foreground bg-secondary/40 px-2 py-1 rounded-md border border-border/60">
                    {rm.yes}¢
                  </span>
                </div>
              </button>
            ))}
        </div>
      </div>

      {/* 8. RULES & RESOLUTION CRITERIA */}
      {(() => {
        const rules = getDetailedMarketRules(market)
        return (
          <div className="space-y-3.5 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <h3 className="text-xs font-extrabold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Info className="h-3.5 w-3.5 text-primary stroke-[2.2px]" />
                Rules
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-foreground/90 font-medium">
              {rules.summary}
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-primary tracking-wider block">🔍 Oracle Verification Source</span>
                <p className="text-[11px] text-muted-foreground leading-snug">{rules.oracleSource}</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-secondary/20 p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-yes tracking-wider block">🎯 Settlement Rule</span>
                <p className="text-[11px] text-muted-foreground leading-snug">{rules.settlementRule}</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-secondary/20 p-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">⚖️ Tie-Break & Ambiguity Rule</span>
                <p className="text-[11px] text-muted-foreground leading-snug">{rules.tieBreakRule}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
              <span>Settlement Venue: UMA Optimistic Oracle</span>
              <span className="font-mono text-primary font-bold">ID: {market.id}</span>
            </div>
          </div>
        )
      })()}

      {/* 9. RESOLUTION SOURCE CARD (Only shown if market has resolutionSource) */}
      {market.resolutionSource && (
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm transition-all hover:border-primary/40">
          <a
            href={`https://${market.resolutionSource}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 w-full group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/40 border border-border/60 group-hover:border-primary/40 transition-colors">
                <Globe className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors stroke-[1.8px]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-muted-foreground">
                  Resolution source
                </span>
                <span className="text-sm font-extrabold text-foreground font-mono truncate group-hover:text-primary transition-colors">
                  {market.resolutionSource}
                </span>
              </div>
            </div>

            <ArrowUpRight className="h-5 w-5 text-muted-foreground shrink-0 stroke-[2px] group-hover:text-primary transition-colors" />
          </a>
        </div>
      )}
    </div>
  )
}
