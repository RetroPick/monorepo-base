'use client'

import {
  Bitcoin,
  Landmark,
  Trophy,
  Cpu,
  DollarSign,
  Bot,
  Sparkles,
  ArrowRight,
  Flame,
  Newspaper,
} from 'lucide-react'
import { MARKETS, FEATURED, type Market } from '@/lib/retropick-data'
import { SectionHeader } from '../ui-bits'
import { MarketCard } from '../market-card'

const TRENDING_CATS = [
  { label: 'Crypto', icon: Bitcoin },
  { label: 'Politics', icon: Landmark },
  { label: 'Sports', icon: Trophy },
  { label: 'Technology', icon: Cpu },
  { label: 'Finance', icon: DollarSign },
  { label: 'AI', icon: Bot },
]

const NEWS = [
  {
    source: 'CoinDesk',
    time: '12m ago',
    title: 'Bitcoin ETF inflows hit record high as $200K bets surge',
  },
  {
    source: 'Bloomberg',
    time: '1h ago',
    title: 'Fed signals possible rate cut, prediction odds shift to 71%',
  },
  {
    source: 'Reuters',
    time: '3h ago',
    title: 'World Cup 2026 host cities finalized ahead of ticket sales',
  },
]

export function ExploreScreen({
  onOpenMarket,
  markets = MARKETS,
}: {
  onOpenMarket: (m: Market) => void
  markets?: Market[]
}) {
  // Get trending markets (highest volume)
  const trendingMarkets = [...markets].sort((a, b) => {
    const aVol = parseInt((a.volume || '0').replace(/[^\d]/g, '')) || 0
    const bVol = parseInt((b.volume || '0').replace(/[^\d]/g, '')) || 0
    return bVol - aVol
  }).slice(0, 3)

  return (
    <div className="animate-fade-up space-y-7 px-5 pb-28 pt-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Good Evening, Trader
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What will happen next?
        </p>
      </div>

      {/* Featured banner */}
      <button className="relative block w-full overflow-hidden rounded-[12px] p-5 text-left shadow-lg shadow-blue-deep/20">
        <div className="absolute inset-0 bg-gradient-to-br from-blue via-blue-deep to-[#1b2f9e]" />
        <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-sky/25 blur-2xl" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {FEATURED.tag}
            </span>
            <p className="mt-2.5 font-display text-lg font-bold leading-tight text-white text-balance">
              {FEATURED.title}
            </p>
            <p className="mt-1 text-xs text-white/80">{FEATURED.subtitle}</p>
            <span className="mt-3.5 inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-blue-deep">
              {FEATURED.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <Trophy className="h-16 w-16 shrink-0 text-white/90" />
        </div>
      </button>

      {/* Categories — monochrome blue */}
      <section className="space-y-3.5">
        <SectionHeader title="Trending Categories" action="See all" />
        <div className="grid grid-cols-6 gap-2">
          {TRENDING_CATS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-border bg-primary/10">
                <Icon className="h-[18px] w-[18px] text-primary" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* AI highlight */}
      <section className="rounded-[12px] border border-primary/25 bg-primary/[0.07] p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            AI Highlight
          </span>
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            BETA
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          AI predicts a{' '}
          <span className="font-semibold text-foreground">62% probability</span>{' '}
          for Bitcoin to reach $200K before Dec 31, 2025.
        </p>
        <button className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary">
          View Insight
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </section>

      {/* Trending markets */}
      <section className="space-y-3.5">
        <SectionHeader title="Trending Markets" action="See all" />
        <div className="space-y-3">
          {trendingMarkets.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              onClick={() => onOpenMarket(m)}
            />
          ))}
        </div>
      </section>

      {/* Latest news */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4 text-primary" />
          <SectionHeader title="Latest News" action="See all" />
        </div>
        <div className="overflow-hidden rounded-[12px] border border-border bg-card">
          {NEWS.map((n, i) => (
            <button
              key={n.title}
              className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors active:bg-accent ${
                i !== NEWS.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary/10">
                <Newspaper className="h-4 w-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                  {n.title}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {n.source} · {n.time}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Ending soon */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-no" />
          <SectionHeader title="Ending Soon" />
        </div>
        <div className="space-y-3">
          {markets.slice(3, 6).map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              onClick={() => onOpenMarket(m)}
            />
          ))}
        </div>
      </section>

      {/* Popular this week */}
      <section className="space-y-3.5">
        <SectionHeader title="Popular This Week" action="See all" />
        <div className="space-y-3">
          {markets.slice(6).map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              onClick={() => onOpenMarket(m)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
