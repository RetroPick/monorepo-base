'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Bitcoin,
  TrendingDown,
  Banknote,
  Trophy,
  Zap,
  Brain,
  Cloud,
  Sparkles,
  ArrowRight,
  Flame,
  Newspaper,
  RefreshCw,
  X,
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { MARKETS, FEATURED, type Market } from '@/lib/retropick-data'
import { SectionHeader } from '../ui-bits'
import { MarketCard } from '../market-card'

const TRENDING_CATS = [
  { label: 'Crypto', icon: Bitcoin, categoryKey: 'Crypto' },
  { label: 'Economics', icon: TrendingDown, categoryKey: 'Economics' },
  { label: 'Financials', icon: Banknote, categoryKey: 'Finance' },
  { label: 'Sport', icon: Trophy, categoryKey: 'Sports' },
  { label: 'Tech & Science', icon: Zap, categoryKey: 'Tech' },
  { label: 'AI', icon: Brain, categoryKey: 'AI' },
  { label: 'Climate', icon: Cloud, categoryKey: 'Climate' },
]

const AI_INSIGHTS = [
  {
    tag: 'BETA',
    prob: '62%',
    text: 'for Bitcoin to reach $200K before Dec 31, 2025.',
  },
  {
    tag: 'SIGNAL',
    prob: '74%',
    text: 'for Fed to implement a 25bps rate cut in upcoming monetary meeting.',
  },
  {
    tag: 'ALGO DETECT',
    prob: '81%',
    text: 'for Solana ecosystem volume breaking new all-time high.',
  },
  {
    tag: 'WHALE ALERT',
    prob: '68%',
    text: 'for Base Network prediction TVL surging +34% this week.',
  },
]

export type NewsItem = {
  id: string
  source: string
  time: string
  title: string
  summary: string
  category: 'Crypto' | 'Macro' | 'Sports'
  marketId?: string
  url: string
}

const NEWS: NewsItem[] = [
  {
    id: 'news-1',
    source: 'CoinDesk',
    time: '12m ago',
    category: 'Crypto',
    title: 'Bitcoin ETF inflows hit record high as $200K bets surge',
    summary: 'Institutional demand for Bitcoin spot ETFs surged past $1.2B today, driven by massive accumulation from hedge funds betting on a $200K rally by end of year.',
    marketId: 'btc-up-down-direction',
    url: 'https://coindesk.com',
  },
  {
    id: 'news-2',
    source: 'Bloomberg',
    time: '1h ago',
    category: 'Macro',
    title: 'Fed signals possible rate cut, prediction odds shift to 71%',
    summary: 'Federal Reserve officials hinted at easing monetary policy in the upcoming FOMC meeting. Polymarket traders moved odds for "No Change" to 71%.',
    marketId: 'fed-decision-july',
    url: 'https://bloomberg.com',
  },
  {
    id: 'news-3',
    source: 'Reuters',
    time: '3h ago',
    category: 'Sports',
    title: 'World Cup 2026 host cities finalized ahead of ticket sales',
    summary: 'FIFA has officially confirmed stadium allocations and match schedules across the United States, Mexico, and Canada for the 2026 World Cup tournament.',
    marketId: 'fifa-2026',
    url: 'https://reuters.com',
  },
]

export function ExploreScreen({
  onOpenMarket,
  markets = MARKETS,
  onSelectCategory,
}: {
  onOpenMarket: (m: Market) => void
  markets?: Market[]
  onSelectCategory?: (category: string) => void
}) {
  const [greeting, setGreeting] = useState<string>('Good Evening')

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours()
      if (hour >= 4 && hour < 11) {
        setGreeting('Good Morning')
      } else if (hour >= 11 && hour < 18) {
        setGreeting('Good Afternoon')
      } else if (hour >= 18 && hour < 23) {
        setGreeting('Good Evening')
      } else {
        setGreeting('Good Night')
      }
    }
    updateGreeting()
    const timer = setInterval(updateGreeting, 30000)
    return () => clearInterval(timer)
  }, [])

  const [aiIndex, setAiIndex] = useState(0)
  const [isRotating, setIsRotating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRotating(true)
      setTimeout(() => {
        setAiIndex((prev) => (prev + 1) % AI_INSIGHTS.length)
        setIsRotating(false)
      }, 300)
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  const currentInsight = AI_INSIGHTS[aiIndex]
  const [showBanner, setShowBanner] = useState(true)
  const hasImportantEvent = FEATURED && FEATURED.title && showBanner
  const [showAllNews, setShowAllNews] = useState(false)

  // Dynamically generate real-time news headlines based on live Polymarket feed
  const dynamicNews = useMemo(() => {
    const cryptoMarket = markets.find((m) => (m.category || '').toLowerCase() === 'crypto') || markets[0]
    const econMarket = markets.find((m) => (m.category || '').toLowerCase() === 'economics' || (m.category || '').toLowerCase() === 'finance') || markets[1] || markets[0]
    const sportsMarket = markets.find((m) => (m.category || '').toLowerCase() === 'sports') || markets[2] || markets[0]

    return [
      {
        id: 'news-1',
        source: 'CoinDesk',
        time: '8m ago',
        title: cryptoMarket ? `${cryptoMarket.question}` : 'Bitcoin ETF inflows hit record high as $200K bets surge',
        targetMarket: cryptoMarket,
      },
      {
        id: 'news-2',
        source: 'Bloomberg',
        time: '42m ago',
        title: econMarket ? `${econMarket.question}` : 'Fed signals possible rate cut, prediction odds shift to 71%',
        targetMarket: econMarket,
      },
      {
        id: 'news-3',
        source: 'Reuters',
        time: '2h ago',
        title: sportsMarket ? `${sportsMarket.question}` : 'World Cup & Premier League match odds update',
        targetMarket: sportsMarket,
      },
    ]
  }, [markets])

  const trendingMarkets = [...markets].sort((a, b) => {
    const aVol = parseInt((a.volume || '0').replace(/[^\d]/g, '')) || 0
    const bVol = parseInt((b.volume || '0').replace(/[^\d]/g, '')) || 0
    return bVol - aVol
  }).slice(0, 3)

  return (
    <div className="relative animate-fade-up space-y-5 px-5 pb-36 pt-4">
      {/* Header Greeting */}
      <div>
        <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">
          {greeting}, Trader
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What will happen next?
        </p>
      </div>

      {/* Featured Banner */}
      {hasImportantEvent && (
        <div className="relative block w-full overflow-hidden rounded-xl border border-primary/20 bg-card p-4 text-left shadow-lg shadow-primary/5 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-card to-card" />
          <div className="absolute -right-6 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          
          <button
            onClick={() => setShowBanner(false)}
            className="absolute right-3.5 top-3.5 z-10 rounded-md bg-secondary/40 p-1 text-muted-foreground hover:text-foreground transition-all"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 stroke-[2px]" />
          </button>

          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {FEATURED.tag}
              </span>
              <p className="font-display text-base font-bold leading-snug text-white">
                {FEATURED.title}
              </p>
              <p className="text-xs text-muted-foreground">{FEATURED.subtitle}</p>
              <button 
                onClick={() => {
                  const targetM = markets.find(m => m.question.toLowerCase().includes('world cup')) || markets[0]
                  if (targetM) onOpenMarket(targetM)
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all"
              >
                {FEATURED.cta}
                <ArrowRight className="h-3.5 w-3.5 stroke-[2px]" />
              </button>
            </div>
            <Trophy className="h-14 w-14 shrink-0 text-primary/80" />
          </div>
        </div>
      )}

      {/* Categories */}
      <section className="space-y-2.5">
        <SectionHeader title="Trending Categories" action="See all" />
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {TRENDING_CATS.map(({ label, icon: Icon, categoryKey }) => (
            <button
              key={label}
              type="button"
              onClick={() => onSelectCategory?.(categoryKey || label)}
              className="flex min-w-[62px] flex-col items-center gap-1.5 hover:scale-105 transition-all cursor-pointer shrink-0"
            >
              <span className="grid h-10 w-10 place-items-center rounded-md border border-border bg-secondary/20">
                <Icon className="h-4.5 w-4.5 text-primary stroke-[2px]" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* AI Highlight Card */}
      <section className="rounded-xl border border-primary/20 bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse stroke-[2px]" />
            <span className="text-sm font-bold text-foreground">
              AI Highlight
            </span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {currentInsight.tag}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              {AI_INSIGHTS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === aiIndex ? 'w-3 bg-primary' : 'w-1.5 bg-primary/30'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => setAiIndex((prev) => (prev + 1) % AI_INSIGHTS.length)}
              className="text-muted-foreground hover:text-primary p-0.5 transition-all"
              aria-label="Next AI insight"
            >
              <RefreshCw className={`h-3.5 w-3.5 stroke-[2px] ${isRotating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <p className={`text-xs leading-relaxed text-muted-foreground transition-opacity duration-300 ${isRotating ? 'opacity-30' : 'opacity-100'}`}>
          AI predicts a{' '}
          <strong className="font-bold text-foreground">{currentInsight.prob} probability</strong>{' '}
          {currentInsight.text}
        </p>

        <button 
          onClick={() => {
            const target = markets[aiIndex % markets.length]
            if (target) onOpenMarket(target)
          }}
          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline pt-0.5"
        >
          View Insight
          <ArrowRight className="h-3.5 w-3.5 stroke-[2px]" />
        </button>
      </section>

      {/* Trending Markets */}
      <section className="space-y-2.5">
        <SectionHeader title="Trending Markets" action="See all" />
        <div className="space-y-2.5">
          {trendingMarkets.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              onClick={() => onOpenMarket(m)}
            />
          ))}
        </div>
      </section>

      {/* Latest News */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary stroke-[2px]" />
            <span className="font-display text-sm font-bold text-foreground">Latest News</span>
          </div>
          <button 
            type="button"
            onClick={() => setShowAllNews(true)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {dynamicNews.map((n, i) => {
            const targetM = n.targetMarket || markets[i % markets.length]

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (targetM) onOpenMarket(targetM)
                }}
                className={`flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-secondary/20 ${
                  i !== 2 ? 'border-b border-border/60' : ''
                }`}
              >
                <span className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-md bg-primary/10 border border-primary/20">
                  <Newspaper className="h-4 w-4 text-primary stroke-[2px]" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 text-xs font-bold leading-snug text-foreground">
                    {n.title}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{n.source} · {n.time}</span>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-0.5">
                      Trade <ArrowRight className="h-3 w-3 stroke-[2px]" />
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Popular this week */}
      <section className="space-y-2.5">
        <SectionHeader title="Popular This Week" action="See all" />
        <div className="space-y-2.5">
          {markets.slice(3, 6).map((m) => (
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
