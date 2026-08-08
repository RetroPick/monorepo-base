'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  Share2,
  BadgeCheck,
  Sparkles,
  Users,
  Droplets,
  BarChart2,
  Clock,
  ExternalLink,
  ChevronDown,
  TrendingUp,
} from 'lucide-react'
import { type Market, SOURCES, MARKETS } from '@/lib/retropick-data'
import { MiniChart } from '../mini-chart'
import { MarketCard } from '../market-card'

const RANGES = ['1H', '6H', '1D', '1W', '1M', 'ALL']

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-[10px] border border-border bg-secondary/30 p-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <p className="mt-1 text-[12px] font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function MarketDetail({
  market,
  onBack,
  onTrade,
}: {
  market: Market
  onBack: () => void
  onTrade: (side: 'yes' | 'no') => void
}) {
  const [range, setRange] = useState('1D')
  const up = market.trend === 'up'

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <button onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-sm font-semibold text-foreground">Market Detail</span>
        <div className="flex items-center gap-3">
          <button aria-label="Notifications" className="relative">
            <div className="h-5 w-5 rounded-full bg-secondary/50" />
          </button>
          <button aria-label="Share">
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
          <button aria-label="Bookmark">
            <Bookmark className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="border-b border-border bg-card px-5 py-2">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-primary">Trending</span>
          {' › '}
          <span className="text-primary">{market.category}</span>
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
            <span>👥 {market.participants} Traders</span>
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
              <p className="mt-1 text-sm font-semibold text-foreground">25/07/2026</p>
            </div>
            <div className="rounded-[10px] border border-border bg-secondary/30 p-3">
              <p className="text-[10px] text-muted-foreground">24h Volume</p>
              <p className="mt-1 text-sm font-semibold text-foreground">$1.1m</p>
            </div>
            <div className="rounded-[10px] border border-border bg-secondary/30 p-3">
              <p className="text-[10px] text-muted-foreground">Total Volume</p>
              <p className="mt-1 text-sm font-semibold text-foreground">$2.4m</p>
            </div>
          </div>

          {/* Large Chart Section */}
          <section className="rounded-[12px] border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">XRP/USD</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-foreground">$1.0863</p>
                  <p className={`text-sm font-semibold ${up ? 'text-yes' : 'text-no'}`}>
                    {up ? '↑' : '↓'} 124%
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
                  className={`rounded-[6px] py-1.5 text-[9px] font-semibold transition-colors ${
                    range === r
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Trade Panel */}
          <section className="rounded-[12px] border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-bold text-foreground">Trade</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[10px] border border-yes/30 bg-yes/10 p-3">
                <p className="flex items-center gap-1 text-xs font-bold text-yes">
                  <span>↑</span> Up
                </p>
                <p className="mt-2 text-xl font-bold text-yes">51¢</p>
                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Potential Payout</span>
                    <span className="text-foreground">$1.96 (92%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shares You&apos;ll Receive</span>
                    <span className="text-foreground">—</span>
                  </div>
                </div>
                <button
                  onClick={() => onTrade('yes')}
                  className="mt-3 w-full rounded-[10px] bg-yes py-2.5 text-sm font-bold text-white"
                >
                  Buy Up 51¢
                </button>
              </div>
              <div className="rounded-[10px] border border-no/30 bg-no/10 p-3">
                <p className="flex items-center gap-1 text-xs font-bold text-no">
                  <span>↓</span> Down
                </p>
                <p className="mt-2 text-xl font-bold text-no">50¢</p>
                <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Potential Payout</span>
                    <span className="text-foreground">$1.90 (90%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shares You&apos;ll Receive</span>
                    <span className="text-foreground">—</span>
                  </div>
                </div>
                <button
                  onClick={() => onTrade('no')}
                  className="mt-3 w-full rounded-[10px] bg-no py-2.5 text-sm font-bold text-white"
                >
                  Buy Down 50¢
                </button>
              </div>
            </div>
          </section>

          {/* Market Outcomes */}
          <section>
            <h3 className="mb-3 text-sm font-bold text-foreground">Market Outcomes</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-[10px] border border-border bg-card p-3">
                <span className="text-sm font-semibold text-foreground">Up</span>
                <span className="text-sm font-bold text-primary">{market.yes}%</span>
              </div>
              <div className="flex items-center justify-between rounded-[10px] border border-border bg-card p-3">
                <span className="text-sm font-semibold text-foreground">Down</span>
                <span className="text-sm font-bold text-primary">{100 - market.yes}%</span>
              </div>
            </div>
          </section>

          {/* Resolution Rules Section */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">Resolution Rules</h3>
            <p className="rounded-[10px] border border-border bg-card p-3 text-[12px] leading-relaxed text-muted-foreground">
              This market resolves YES if the XRP price at the end of the time range specified in the title is greater than or equal to the price at the beginning of that range. Otherwise, it will resolve to DOWN.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[10px] border border-border bg-card p-3">
                <p className="text-[10px] font-semibold text-muted-foreground">Resolution Source</p>
                <p className="mt-1 text-sm font-semibold text-foreground">data.chain.link</p>
              </div>
              <div className="rounded-[10px] border border-border bg-card p-3">
                <p className="text-[10px] font-semibold text-muted-foreground">Settlement</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Automated</p>
              </div>
            </div>
          </section>

          {/* Verified Sources Section */}
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">Verified Sources</h3>
            <div className="space-y-2">
              {SOURCES.map((s) => (
                <button
                  key={s.name}
                  className="flex w-full items-center justify-between rounded-[10px] border border-border bg-card p-3 transition-colors active:bg-secondary"
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
                </button>
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

