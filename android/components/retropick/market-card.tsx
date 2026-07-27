'use client'

import { BadgeCheck, Clock } from 'lucide-react'
import type { Market } from '@/lib/retropick-data'
import { MiniChart } from './mini-chart'
import { cn } from '@/lib/utils'

function IconChip({ market }: { market: Market }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[8px] font-bold tracking-tight text-white"
      style={{ backgroundColor: market.accent }}
    >
      {market.icon}
    </span>
  )
}

function MarketTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    'UP_OR_DOWN': 'UP OR DOWN',
    'MULTIPLE_CHOICE': 'MULTIPLE CHOICE',
    'RANGE': 'RANGE',
    'THRESHOLD': 'THRESHOLD',
    'DATE': 'DATE',
  }
  return (
    <span className="inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
      {labels[type] || type}
    </span>
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
  const up = market.trend === 'up'

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="flex w-full flex-col gap-2 rounded-[10px] border border-border bg-card p-2.5 text-left transition-all active:scale-[0.98] active:bg-secondary"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
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
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="w-full rounded-[12px] border border-border bg-card p-3.5 text-left transition-all active:scale-[0.99] active:bg-secondary"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
              {market.category}
            </span>
            <MarketTypeLabel type={market.marketType} />
            {market.verified && (
              <BadgeCheck className="h-3 w-3 text-blue shrink-0" />
            )}
          </div>
          <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug text-foreground">
            {market.question}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 text-xl font-bold',
            up ? 'text-yes' : 'text-no',
          )}
        >
          {up ? '↑' : '↓'} {market.yes}%
        </span>
      </div>

      {/* Chart and info row */}
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="text-[10px] text-muted-foreground space-y-0.5">
          <p>{market.volume} Vol</p>
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {market.timeLeft}
          </p>
        </div>
        <MiniChart data={market.chart} up={up} width={70} height={28} />
      </div>
    </button>
  )
}
