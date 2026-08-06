'use client'

import { useState } from 'react'
import { 
  BadgeCheck, 
  Clock, 
  Star, 
  Check,
  Calendar,
  MoreHorizontal,
  Info,
  TrendingUp,
} from 'lucide-react'
import { type Market, getSafeMarketImage, getOptionThumbnail } from '@/lib/retropick-data'
import { extractSubTags } from '@/lib/polymarket-service'
import { MiniChart } from './mini-chart'
import { cn } from '@/lib/utils'

function MarketTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    'UP_OR_DOWN': 'DIRECTION',
    'MULTIPLE_CHOICE': 'MULTIPLE CHOICE',
    'RANGE': 'RANGE',
    'THRESHOLD': 'THRESHOLD',
    'LADDER': 'LADDER',
    'VELOCITY': 'VELOCITY',
    'DATE': 'DATE',
    'CONVERGENCE': 'CONVERGENCE',
  }
  return (
    <span className="inline-block rounded-md border border-border/80 bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
      {labels[type] || type}
    </span>
  )
}

function BrandIcon({ name }: { name: string }) {
  if (name === 'openai') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#10a37f] text-white text-[8px] font-black leading-none">
        O
      </span>
    )
  }
  if (name === 'google') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#4285f4] text-white text-[8px] font-black leading-none">
        G
      </span>
    )
  }
  if (name === 'claude') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#c4a26d] text-white text-[8px] font-black leading-none">
        C
      </span>
    )
  }
  if (name === 'grok') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-black border border-white/20 text-white text-[8px] font-black leading-none">
        X
      </span>
    )
  }
  if (name === 'tesla') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#e82127] text-white text-[8px] font-black leading-none">
        T
      </span>
    )
  }
  if (name === 'byd') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#003478] text-white text-[8px] font-black leading-none">
        B
      </span>
    )
  }
  if (name === 'apple') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#a1a1a1] text-white text-[8px] font-black leading-none">
        A
      </span>
    )
  }
  if (name === 'base') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#0052ff] text-white text-[8px] font-black leading-none">
        B
      </span>
    )
  }
  if (name === 'solana') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-[#14f195] text-black text-[8px] font-black leading-none">
        S
      </span>
    )
  }
  return (
    <span className="h-2 w-2 rounded-sm bg-muted-foreground/50 shrink-0" />
  )
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

function MarketThumbnail({ market }: { market: Market }) {
  const imgSrc = getSafeMarketImage(market)
  const isTransparent = isTransparentLogoAsset(imgSrc)

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-400/40 dark:border-zinc-600/60 bg-slate-300/80 dark:bg-zinc-700/90 p-1 shadow-2xs group-hover:scale-105 transition-all">
      <img
        src={imgSrc}
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

function getMarketDescription(market: Market): string {
  if (market.description && market.description.length <= 160) {
    return market.description
  }
  
  const cleanParticipants = String(market.participants || '100+').replace(/traders?/gi, '').trim()

  if (market.marketType === 'UP_OR_DOWN') {
    return `Resolves based on verified outcome sources for "${market.question}". Total volume traded is ${market.volume} with ${cleanParticipants} active traders.`
  }
  return `Resolves according to verified outcome sources for "${market.question}". Total volume traded is ${market.volume} with ${market.timeLeft} remaining.`
}

export function MarketCard({
  market,
  variant = 'full',
  onClick,
}: {
  market: Market
  variant?: 'full' | 'compact'
  onClick?: () => void
}) {
  const [starred, setStarred] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const up = market.trend === 'up'

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setStarred(!starred)
  }

  const handleToggleChart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowChart(!showChart)
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="flex w-full flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5 text-left transition-all active:scale-[0.99] cursor-pointer hover:border-primary/40"
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold uppercase text-primary tracking-wider">{market.category}</span>
              <MarketTypeLabel type={market.marketType} />
            </div>
            <p className="mt-1 line-clamp-1 text-xs font-semibold leading-tight text-foreground">
              {market.question}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 text-base font-bold',
              up ? 'text-yes' : 'text-no',
            )}
          >
            {market.yes}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
          <span className="text-[11px] font-medium text-muted-foreground">{market.volume} Vol</span>
          <span className="text-[11px] font-medium text-muted-foreground">{market.timeLeft}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="w-full rounded-xl border border-border/80 bg-card p-3.5 pb-2 text-left transition-all cursor-pointer hover:border-primary/40 shadow-sm"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0 min-h-[44px]">
          <MarketThumbnail market={market} />
          <div className="flex-1 min-w-0 my-auto">
            <h3 className="text-xs sm:text-sm font-bold leading-snug text-foreground">
              {market.question}
            </h3>
          </div>
        </div>

        {/* Right Side: Star icon */}
        <div className="flex items-center shrink-0 self-center">
          <button 
            type="button"
            onClick={handleStarClick}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
            aria-label="Star market"
          >
            <Star className={cn("h-4 w-4 stroke-[2px]", starred ? "fill-primary text-primary" : "text-muted-foreground")} />
          </button>
        </div>
      </div>

      {/* Middle Section: Clean Green UP & Red DOWN Buttons OR Options List */}
      {market.options && market.options.length > 0 ? (
        <div className="mt-3.5 space-y-2">
          {market.options.slice(0, 4).map((opt, idx) => {
            const isLadder = market.marketType === 'LADDER'
            const isChecked = isLadder && idx === 0

            return (
              <div
                key={opt.label}
                className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-border/70 bg-secondary/20 px-3.5 py-3 text-xs font-semibold hover:border-primary/50 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  if (onClick) onClick()
                }}
              >
                <div
                  className="absolute bottom-0 left-0 top-0 bg-primary/15 transition-all duration-500 rounded-lg group-hover:bg-primary/25"
                  style={{ width: `${opt.percentage}%` }}
                />
                
                <div className="relative flex items-center gap-2.5">
                  {isChecked && <Check className="h-4 w-4 text-yes stroke-[2.5px] shrink-0" />}
                  {(() => {
                    const imgSrc = getOptionThumbnail(opt.label, market)
                    if (!imgSrc) return null
                    return (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md shadow-2xs group-hover:scale-105 transition-transform">
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
                  <span className="font-bold text-foreground">{opt.label}</span>
                </div>
                
                <span className="relative text-primary font-mono text-xs font-black bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-md">
                  {opt.percentage}%
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {/* UP Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (onClick) onClick()
            }}
            className="flex items-center justify-between rounded-xl border border-yes/30 bg-yes-soft hover:bg-yes/20 px-3.5 py-3 text-xs font-bold text-yes active:scale-[0.98] transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yes/20 text-yes font-black text-xs group-hover:scale-110 transition-transform">
                ↑
              </span>
              <span className="text-xs sm:text-sm font-extrabold tracking-wide text-yes">
                Up
              </span>
            </div>
            <span className="rounded-md bg-yes/20 px-2 py-0.5 font-mono text-xs font-bold text-yes border border-yes/30">
              {market.yes}¢
            </span>
          </button>

          {/* DOWN Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (onClick) onClick()
            }}
            className="flex items-center justify-between rounded-xl border border-no/30 bg-no-soft hover:bg-no/20 px-3.5 py-3 text-xs font-bold text-no active:scale-[0.98] transition-all cursor-pointer shadow-xs group"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-no/20 text-no font-black text-xs group-hover:scale-110 transition-transform">
                ↓
              </span>
              <span className="text-xs sm:text-sm font-extrabold tracking-wide text-no">
                Down
              </span>
            </div>
            <span className="rounded-md bg-no/20 px-2 py-0.5 font-mono text-xs font-bold text-no border border-no/30">
              {100 - market.yes}¢
            </span>
          </button>
        </div>
      )}

      {/* Footer Row: Ultra-Compact 3-Dots Button */}
      <div className="mt-1 flex items-center justify-center -mb-0.5">
        <button
          type="button"
          onClick={handleToggleChart}
          className={cn(
            "p-0.5 rounded-full hover:bg-secondary/60 transition-colors text-muted-foreground/60 hover:text-foreground flex items-center justify-center h-3.5 w-7",
            showChart && "bg-secondary text-primary font-bold"
          )}
          title="Toggle Details & Chart"
          aria-label="Toggle Details & Chart"
        >
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </div>

      {/* Compact Clean Mini Chart & Details Drawer */}
      {showChart && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 overflow-hidden rounded-xl border border-border/60 bg-secondary/15 p-3.5 space-y-2.5 transition-all animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Trend Header */}
          <div className="flex items-center justify-between px-0.5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <TrendingUp className="h-3.5 w-3.5 text-primary stroke-[2px]" />
              24H Price Trend
            </span>
            <span className={cn(
              "text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border",
              up ? "bg-yes/20 text-yes border-yes/30" : "bg-no/20 text-no border-no/30"
            )}>
              {up ? '↑ +' : '↓ -'}{market.yes}% (24H)
            </span>
          </div>

          {/* Clean Chart Area with Y-Axis Percentage Numbers */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="h-[52px] flex-1">
              <MiniChart data={market.chart} up={up} width={300} height={50} className="w-full h-full" strokeWidth={2} />
            </div>
            {/* Y-Axis Price Numbers */}
            <div className="flex flex-col justify-between h-[48px] text-[9px] font-bold font-mono text-muted-foreground/80 shrink-0 text-right pr-0.5">
              <span>40%</span>
              <span>25%</span>
              <span>10%</span>
            </div>
          </div>

          {/* X-Axis Time Labels */}
          <div className="flex justify-between text-[9px] font-bold font-mono text-muted-foreground/70 px-1 pb-0.5">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>

          {/* Clear Divider Line & Description Section Header */}
          <div className="pt-2.5 border-t border-border/60 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
              <Info className="h-3.5 w-3.5 text-primary stroke-[2px]" />
              <span>Market Overview</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground/90 font-medium">
              {getMarketDescription(market)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
