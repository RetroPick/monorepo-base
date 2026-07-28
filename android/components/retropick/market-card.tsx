'use client'

import { useState } from 'react'
import { 
  BadgeCheck, 
  Clock, 
  Star, 
  Check,
  Calendar,
} from 'lucide-react'
import type { Market, MarketOption } from '@/lib/retropick-data'
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
    <span className="inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
      {labels[type] || type}
    </span>
  )
}

function BrandIcon({ name }: { name: string }) {
  if (name === 'openai') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10a37f] text-white text-[8px] font-black leading-none">
        O
      </span>
    )
  }
  if (name === 'google') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4285f4] text-white text-[8px] font-black leading-none">
        G
      </span>
    )
  }
  if (name === 'claude') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#c4a26d] text-white text-[8px] font-black leading-none">
        C
      </span>
    )
  }
  if (name === 'grok') {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-black border border-white/20 text-white text-[8px] font-black leading-none">
        X
      </span>
    )
  }
  return (
    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 shrink-0" />
  )
}

function MarketThumbnail({ icon, image, type }: { icon?: string; image?: string; type: string }) {
  if (image && image.startsWith('http')) {
    return (
      <img
        src={image}
        alt=""
        className="h-11 w-11 shrink-0 rounded-[12px] object-cover border border-border/30 bg-secondary/15"
      />
    )
  }
  if (icon === 'BTC') {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#f7931a]/15 text-[#f7931a]">
        <span className="font-display text-lg font-black leading-none">₿</span>
      </div>
    )
  }
  if (icon === 'ETH') {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#627eea]/15 text-[#627eea]">
        <span className="font-display text-lg font-black leading-none">Ξ</span>
      </div>
    )
  }
  if (icon === 'SOL') {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#14f195]/15 text-[#14f195]">
        <span className="font-display text-xs font-black leading-none">SOL</span>
      </div>
    )
  }
  if (icon === 'FED') {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#20c997]/15 text-[#20c997]">
        <span className="text-lg leading-none">🏛️</span>
      </div>
    )
  }
  if (icon === 'GPT' || type === 'DATE') {
    return (
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#10a37f]/15 text-[#10a37f]">
        <Calendar className="h-5 w-5" />
      </div>
    )
  }

  let bg = 'bg-primary/10'
  let text = 'text-primary'
  let char = '📊'

  if (type === 'LADDER') {
    bg = 'bg-purple-500/15'
    text = 'text-purple-400'
    char = '🚀'
  } else if (type === 'VELOCITY') {
    bg = 'bg-orange-500/15'
    text = 'text-orange-400'
    char = '⏱️'
  } else if (type === 'RANGE') {
    bg = 'bg-yellow-500/15'
    text = 'text-yellow-400'
    char = '🪙'
  } else if (type === 'CONVERGENCE') {
    bg = 'bg-blue-500/15'
    text = 'text-blue-400'
    char = '🧠'
  }

  return (
    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]", bg, text)}>
      <span className="text-lg leading-none">{char}</span>
    </div>
  )
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
  const up = market.trend === 'up'

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setStarred(!starred)
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="flex w-full flex-col gap-2 rounded-[12px] border border-border bg-card p-3 text-left transition-all active:scale-[0.98] cursor-pointer hover:bg-secondary/20"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-bold uppercase text-primary">{market.category}</span>
              <MarketTypeLabel type={market.marketType} />
            </div>
            <p className="mt-1 line-clamp-1 text-[12px] font-semibold leading-tight text-foreground">
              {market.question}
            </p>
          </div>
          <span
            className={cn(
              'shrink-0 text-lg font-bold',
              up ? 'text-yes' : 'text-no',
            )}
          >
            {market.yes}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">{market.volume} Vol</span>
          <MiniChart data={market.chart} up={up} width={60} height={24} />
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className="w-full rounded-[14px] border border-border bg-card p-4 text-left transition-all cursor-pointer hover:bg-secondary/10"
    >
      {/* Top Header Row with Thumbnail, Question, and Chart */}
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Thumbnail and Badge/Question */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <MarketThumbnail icon={market.icon} image={market.image} type={market.marketType} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <MarketTypeLabel type={market.marketType} />
              {market.verified && (
                <BadgeCheck className="h-3 w-3 text-blue shrink-0" />
              )}
            </div>
            <p className="mt-1 text-[14px] font-bold leading-snug text-foreground">
              {market.question}
            </p>
          </div>
        </div>

        {/* Right Side: Star, Percentage, Sparkline */}
        <div className="flex flex-col items-end shrink-0 gap-1.5">
          <button 
            onClick={handleStarClick}
            className="text-muted-foreground hover:text-yellow transition-colors"
            aria-label="Star market"
          >
            <Star className={cn("h-4 w-4", starred ? "fill-yellow text-yellow" : "text-muted-foreground")} />
          </button>
          <div className="flex flex-col items-end">
            <span className={cn('text-lg font-black leading-none', up ? 'text-yes' : 'text-no')}>
              {market.yes}%
            </span>
            <div className="mt-1">
              <MiniChart data={market.chart} up={up} width={64} height={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Middle Options / Interactive Elements */}
      {market.options && market.options.length > 0 && (
        <div className="mt-3.5 space-y-2">
          {market.options.map((opt, idx) => {
            const isLadder = market.marketType === 'LADDER'
            const isChecked = isLadder && idx === 0

            return (
              <div
                key={opt.label}
                className="relative flex items-center justify-between overflow-hidden rounded-[8px] border border-border bg-secondary/15 px-3.5 py-2 text-xs font-semibold"
              >
                {/* Progress bar background */}
                <div
                  className="absolute bottom-0 left-0 top-0 bg-primary/10 transition-all duration-500"
                  style={{ width: `${opt.percentage}%` }}
                />
                
                {/* Option Content */}
                <div className="relative flex items-center gap-2">
                  {isChecked && <Check className="h-3.5 w-3.5 text-yes shrink-0" />}
                  {opt.icon && <BrandIcon name={opt.icon} />}
                  <span className="text-foreground">{opt.label}</span>
                </div>
                
                {/* Percentage */}
                <span className="relative text-primary font-bold">{opt.percentage}%</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Special DIRECTION Up/Down trade panel inside the card */}
      {market.marketType === 'UP_OR_DOWN' && (
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <div 
            onClick={(e) => {
              e.stopPropagation()
              if (onClick) onClick()
            }}
            className="flex items-center justify-between rounded-[8px] border border-yes/20 bg-yes/5 px-3 py-2 text-xs font-bold text-yes active:scale-[0.98] transition-all hover:bg-yes/10"
          >
            <span>↑ Up</span>
            <div className="flex items-center gap-1">
              <span className="bg-yes/15 px-1.5 py-0.5 rounded text-[10px] text-yes">51¢</span>
              <span className="text-[10px] text-muted-foreground font-normal">x2.0</span>
            </div>
          </div>
          <div 
            onClick={(e) => {
              e.stopPropagation()
              if (onClick) onClick()
            }}
            className="flex items-center justify-between rounded-[8px] border border-no/20 bg-no/5 px-3 py-2 text-xs font-bold text-no active:scale-[0.98] transition-all hover:bg-no/10"
          >
            <span>↓ Down</span>
            <div className="flex items-center gap-1">
              <span className="bg-no/15 px-1.5 py-0.5 rounded text-[10px] text-no">49¢</span>
              <span className="text-[10px] text-muted-foreground font-normal">x2.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Info Row */}
      <div className="mt-3.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
        <div className="flex items-center gap-2">
          <span>{market.volume} Vol</span>
          <span>•</span>
          <span>{market.participants} Traders</span>
        </div>
        <div className="flex items-center gap-1 font-medium text-foreground/80 font-display">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{market.timeLeft}</span>
        </div>
      </div>
    </div>
  )
}
