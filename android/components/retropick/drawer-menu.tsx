'use client'

import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Bitcoin,
  TrendingDown,
  Banknote,
  Trophy,
  Zap,
  Brain,
  Cloud,
  Settings,
  Info,
  HelpCircle,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  Briefcase,
  User,
  ShieldCheck,
  FileText,
  X,
} from 'lucide-react'
import { Logo } from './logo'
import { SearchBar } from './ui-bits'
import { type Market, getSafeMarketImage } from '@/lib/retropick-data'
import { extractSubTags } from '@/lib/polymarket-service'

function getSubCategoryIcon(subValue: string, markets: Market[]): string {
  const subLower = subValue.toLowerCase()

  // 1. Try finding matching market in live markets array
  const matchedMarket = markets.find((m) => {
    const subTags = extractSubTags(m.question, m.category)
    const subTag = (subTags[1] || subTags[0] || '').toLowerCase()
    const q = m.question.toLowerCase()
    return subTag === subLower || q.includes(subLower)
  })

  if (matchedMarket) {
    return getSafeMarketImage(matchedMarket)
  }

  // 2. Sub-topic keyword fallbacks
  if (subLower.includes('chatgpt') || subLower.includes('openai')) {
    return '/images/markets/tech & AI/openAI.webp'
  }
  if (subLower.includes('gemini')) {
    return '/images/markets/tech & AI/gemini.png'
  }
  if (subLower.includes('claude')) {
    return '/images/markets/tech & AI/claude.png'
  }
  if (subLower.includes('grok')) {
    return '/images/markets/tech & AI/grok.png'
  }
  if (subLower.includes('byd')) {
    return '/images/markets/tech & AI/byd.png'
  }
  if (subLower.includes('tesla')) {
    return '/images/markets/tech & AI/tesla.png'
  }
  if (subLower.includes('xiaomi')) {
    return '/images/markets/tech & AI/xiaomi.png'
  }
  if (subLower.includes('volkswagen')) {
    return '/images/markets/tech & AI/volkswagen.png'
  }
  if (subLower.includes('ev')) {
    return '/images/markets/tech & AI/ev.webp'
  }
  if (subLower.includes('spacex') || subLower.includes('starlink')) {
    return '/images/markets/tech & AI/spaceX.webp'
  }
  if (subLower.includes('fed') || subLower.includes('rate') || subLower.includes('fomc') || subLower.includes('inflation')) {
    return '/images/markets/economics/Fed.webp'
  }
  if (subLower.includes('blackrock')) {
    return '/images/markets/finance/blackrock.webp'
  }
  if (subLower.includes('nvidia')) {
    return '/images/markets/finance/nvidia.webp'
  }
  if (subLower.includes('apple')) {
    return '/apple.webp'
  }
  if (subLower.includes('stock') || subLower.includes('asset') || subLower.includes('index')) {
    return '/images/markets/finance/stock.webp'
  }
  if (subLower.includes('btc') || subLower.includes('bitcoin')) {
    return '/images/markets/crypto/bitcoin.webp'
  }
  if (subLower.includes('eth') || subLower.includes('ethereum')) {
    return '/images/markets/crypto/eth.webp'
  }
  if (subLower.includes('sol') || subLower.includes('solana')) {
    return '/images/markets/crypto/solana.webp'
  }
  if (subLower.includes('xrp')) {
    return '/images/markets/crypto/xrp.webp'
  }
  if (subLower.includes('base')) {
    return '/images/markets/crypto/base.png'
  }
  if (subLower.includes('arbitrum')) {
    return '/images/markets/crypto/arbitrum.png'
  }
  if (subLower.includes('optimism') || subLower.includes('op')) {
    return '/images/markets/crypto/optimism.png'
  }
  if (subLower.includes('zksync')) {
    return '/images/markets/crypto/zksync.png'
  }
  if (subLower.includes('layer2') || subLower.includes('l2')) {
    return '/images/markets/crypto/layer2.webp'
  }
  if (subLower.includes('f1') || subLower.includes('formula')) {
    return '/images/markets/Sports/F1.webp'
  }
  if (subLower.includes('nfl')) {
    return '/images/markets/Sports/NFL.webp'
  }
  if (subLower.includes('baseball') || subLower.includes('mlb')) {
    return '/images/markets/Sports/baseball.webp'
  }
  if (subLower.includes('nba')) {
    return '/images/markets/Sports/NBA.webp'
  }
  if (subLower.includes('ufc')) {
    return '/images/markets/Sports/UFC.webp'
  }
  if (subLower.includes('soccer') || subLower.includes('football')) {
    return '/images/markets/Sports/soccer.webp'
  }

  return '/images/markets/crypto/bitcoin.webp'
}

const CATEGORIES_CONFIG = [
  {
    label: 'Trending',
    icon: TrendingUp,
    categoryKey: 'Trending',
    subCategories: [
      { label: 'Bitcoin', value: 'Bitcoin' },
      { label: 'Fed & Rates', value: 'Fed & Rates' },
      { label: 'XRP', value: 'XRP' },
      { label: 'OpenAI', value: 'OpenAI' },
      { label: 'Formula 1', value: 'Formula 1' },
      { label: 'NFL', value: 'NFL' },
    ],
  },
  {
    label: 'Crypto',
    icon: Bitcoin,
    categoryKey: 'Crypto',
    subCategories: [
      { label: 'Bitcoin', value: 'Bitcoin' },
      { label: 'Ethereum', value: 'Ethereum' },
      { label: 'Solana', value: 'Solana' },
      { label: 'XRP', value: 'XRP' },
      { label: 'Layer 2', value: 'Layer 2' },
      { label: 'DeFi & DEX', value: 'DeFi' },
    ],
  },
  {
    label: 'Economics',
    icon: TrendingDown,
    categoryKey: 'Economics',
    subCategories: [
      { label: 'Fed & Rates', value: 'Fed & Rates' },
      { label: 'FOMC', value: 'FOMC' },
      { label: 'CPI & Inflation', value: 'Inflation' },
    ],
  },
  {
    label: 'Financials',
    icon: Banknote,
    categoryKey: 'Finance',
    subCategories: [
      { label: 'Asset Management', value: 'Asset Management' },
      { label: 'NVIDIA', value: 'NVIDIA' },
      { label: 'Apple', value: 'Apple' },
      { label: 'Stock Indices', value: 'Stock Indices' },
      { label: 'Gold & Commodities', value: 'Gold' },
      { label: 'Earnings', value: 'Earnings' },
    ],
  },
  {
    label: 'Sport',
    icon: Trophy,
    categoryKey: 'Sports',
    subCategories: [
      { label: 'Soccer', value: 'Soccer' },
      { label: 'Premier League', value: 'Premier League' },
      { label: 'NFL', value: 'NFL' },
      { label: 'Baseball', value: 'Baseball' },
      { label: 'Basketball / NBA', value: 'NBA' },
      { label: 'Formula 1', value: 'Formula 1' },
      { label: 'MMA / UFC', value: 'MMA' },
    ],
  },
  {
    label: 'Tech & Science',
    icon: Zap,
    categoryKey: 'Tech',
    subCategories: [
      { label: 'Electric Vehicles', value: 'Electric Vehicles' },
      { label: 'Space & Aerospace', value: 'Space' },
      { label: 'Smartphones', value: 'Smartphones' },
      { label: 'Hardware & Chips', value: 'Semiconductors' },
    ],
  },
  {
    label: 'AI',
    icon: Brain,
    categoryKey: 'AI',
    subCategories: [
      { label: 'OpenAI', value: 'OpenAI' },
      { label: 'LLM', value: 'LLM' },
      { label: 'Google Gemini', value: 'Google Gemini' },
      { label: 'Claude', value: 'Claude' },
    ],
  },
  {
    label: 'Climate',
    icon: Cloud,
    categoryKey: 'Climate',
    subCategories: [
      { label: 'Global Warming', value: 'climate' },
      { label: 'CO2 Emissions', value: 'emission' },
    ],
  },
]

const LEGAL_DOCS: Record<string, { title: string; body: string }> = {
  tos: {
    title: 'Terms of Service',
    body: 'RetroPick Markets is a non-custodial interface for Polymarket prediction venues. Users are responsible for maintaining session keys and complying with local regulatory jurisdictions. Polymarket operates as the venue authority under CLOB V2 architecture.',
  },
  privacy: {
    title: 'Privacy Policy',
    body: 'RetroPick collects zero raw private keys and zero personal identifying data without explicit user authorization. Audit logs are redacted and sanitized in accordance with platform security standards.',
  },
  risk: {
    title: 'Risk Disclaimer',
    body: 'Prediction market trading involves significant financial risk. Market outcomes pay out $1.00 USDC per winning share upon settlement. Past performance is not indicative of future returns. Trade responsibly.',
  },
}

export function DrawerMenu({
  open,
  onClose,
  dark,
  markets = [],
  onToggleTheme,
  onSelectExplore,
  onSelectCategory,
  onSubCategoryClick,
  onNavigatePortfolio,
}: {
  open: boolean
  onClose: () => void
  dark: boolean
  markets?: Market[]
  onToggleTheme: () => void
  onSelectExplore?: () => void
  onSelectCategory?: (category: string) => void
  onSubCategoryClick?: (value: string) => void
  onNavigatePortfolio?: () => void
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [activeLegal, setActiveLegal] = useState<{ title: string; body: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Dynamically filter sub-categories so only sub-tags with ACTUAL active markets appear
  const categoriesWithLiveSubTags = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return CATEGORIES_CONFIG.map((c) => {
      const categoryMarkets = (markets || []).filter((m) => {
        const cat = (m.category || '').toLowerCase()
        const key = (c.categoryKey || c.label).toLowerCase()
        if (key === 'trending') return true
        return cat === key || cat.includes(key)
      })

      const liveSubCategories = (c.subCategories || []).filter((sub) => {
        const valLower = sub.value.toLowerCase()
        const labelLower = sub.label.toLowerCase()

        return categoryMarkets.some((m) => {
          const qText = m.question.toLowerCase()
          const tagsMatch = m.tags && m.tags.some((t) => t.toLowerCase().includes(valLower) || t.toLowerCase().includes(labelLower))
          const optionsMatch = m.options && m.options.some((o) => o.label.toLowerCase().includes(valLower))
          return tagsMatch || optionsMatch || qText.includes(valLower) || qText.includes(labelLower)
        })
      })

      return {
        ...c,
        subCategories: liveSubCategories,
      }
    }).filter((c) => {
      if (!q) return true
      const catMatch = c.label.toLowerCase().includes(q) || c.categoryKey.toLowerCase().includes(q)
      const subMatch = c.subCategories.some((s) => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q))
      return catMatch || subMatch
    })
  }, [markets, searchQuery])

  const toggleExpand = (e: React.MouseEvent, label: string) => {
    e.stopPropagation()
    setExpandedCategory(expandedCategory === label ? null : label)
  }

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      onSelectCategory?.(searchQuery.trim())
      onClose()
      setSearchQuery('')
    }
  }

  return (
    <div className={`absolute inset-x-0 top-0 bottom-[82px] z-40 ${open ? '' : 'pointer-events-none'}`}>
      {/* Backdrop (Stops above BottomNav) */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/75 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drawer Container (Meets top of BottomNav cleanly) */}
      <aside
        className={`absolute left-0 top-0 bottom-0 flex w-[82%] max-w-[290px] flex-col border-r border-border border-b border-border bg-card text-foreground transition-transform duration-300 shadow-2xl ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header & Search */}
        <div className="space-y-3.5 border-b border-border/80 px-4 pb-3.5 pt-[calc(1rem+env(safe-area-inset-top,28px))]">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-display text-lg font-black tracking-tight text-foreground">
              RetroPick
            </span>
          </div>
          <SearchBar
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(v) => setSearchQuery(v)}
            onClear={() => setSearchQuery('')}
            onSubmit={handleSearchSubmit}
          />
        </div>

        {/* Scrollable Items */}
        <div className="no-scrollbar flex-1 overflow-y-auto px-3 py-2 space-y-3 pb-8">
          
          {/* Section 1: USER PROFILE */}
          <div className="space-y-1">
            <p className="px-3 pt-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              User Profile
            </p>
            <button
              type="button"
              onClick={() => {
                onNavigatePortfolio?.()
                onClose()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 hover:bg-secondary/40 hover:text-foreground transition-all cursor-pointer"
            >
              <Briefcase className="h-4.5 w-4.5 text-foreground/90 stroke-[2px] shrink-0" />
              <span>Portfolio</span>
            </button>
          </div>

          {/* Section 2: CATEGORIES */}
          <div className="space-y-0.5">
            <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Categories
            </p>

            {searchQuery.trim() && (
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="flex w-full items-center justify-between rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer mb-2"
              >
                <span className="truncate">Search for "{searchQuery}"</span>
                <ChevronRight className="h-4 w-4 shrink-0 stroke-[2.5px]" />
              </button>
            )}
            {categoriesWithLiveSubTags.map((c) => {
              const isExpanded = expandedCategory === c.label
              const hasSubCategories = c.subCategories && c.subCategories.length > 0

              const handleCategoryClick = () => {
                if (hasSubCategories) {
                  setExpandedCategory(isExpanded ? null : c.label)
                } else {
                  if (c.label === 'Trending') {
                    onSelectExplore?.()
                  } else {
                    onSelectCategory?.(c.categoryKey || c.label)
                  }
                  onClose()
                }
              }

              return (
                <div key={c.label}>
                  <div
                    onClick={handleCategoryClick}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 hover:bg-secondary/40 hover:text-foreground transition-all cursor-pointer group"
                  >
                    <span className="flex items-center gap-3 flex-1 min-w-0">
                      <c.icon className="h-4.5 w-4.5 text-foreground/90 stroke-[2px] shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">{c.label}</span>
                    </span>
                    {hasSubCategories && (
                      <span className="p-1 text-muted-foreground group-hover:text-foreground transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 stroke-[2px]" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 stroke-[2px]" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Subcategories dropdown */}
                  {isExpanded && hasSubCategories && (
                    <div className="space-y-1 pl-6 pb-1 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {c.subCategories.map((sub) => {
                        return (
                          <button
                            key={sub.value}
                            type="button"
                            onClick={() => {
                              onSubCategoryClick?.(sub.value)
                              onClose()
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-xl transition-all group cursor-pointer"
                          >
                            <span className="truncate">{sub.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Section 3: PREFERENCES */}
          <div className="space-y-0.5 pt-1 border-t border-border/40">
            <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Preferences
            </p>

            {/* Dark/Light Theme Toggle Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 hover:bg-secondary/40 hover:text-foreground transition-all cursor-pointer"
            >
              <span className="flex items-center gap-3">
                {dark ? (
                  <Moon className="h-4.5 w-4.5 text-foreground/90 stroke-[2px]" />
                ) : (
                  <Sun className="h-4.5 w-4.5 text-foreground/90 stroke-[2px]" />
                )}
                <span>{dark ? 'Dark Theme' : 'Light Theme'}</span>
              </span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  dark ? 'bg-primary' : 'bg-secondary border border-border'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    dark ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </span>
            </button>
          </div>

          {/* Section 4: LEGAL & COMPLIANCE (PLAY_STORE_COMPLIANCE_AND_RELEASE.md) */}
          <div className="space-y-0.5 pt-1 border-t border-border/40">
            <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Legal & Compliance
            </p>
            <button
              type="button"
              onClick={() => setActiveLegal(LEGAL_DOCS.tos)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 hover:bg-secondary/40 hover:text-foreground transition-all cursor-pointer"
            >
              <FileText className="h-4.5 w-4.5 text-muted-foreground stroke-[2px]" />
              <span>Terms of Service</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLegal(LEGAL_DOCS.privacy)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 hover:bg-secondary/40 hover:text-foreground transition-all cursor-pointer"
            >
              <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground stroke-[2px]" />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLegal(LEGAL_DOCS.risk)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold text-foreground/90 hover:bg-secondary/40 hover:text-foreground transition-all cursor-pointer"
            >
              <Info className="h-4.5 w-4.5 text-muted-foreground stroke-[2px]" />
              <span>Risk Disclaimer</span>
            </button>
          </div>

        </div>
      </aside>

      {/* Compliance Legal Reader Modal */}
      {activeLegal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-5 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 relative space-y-3 shadow-2xl">
            <button
              onClick={() => setActiveLegal(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="h-4 w-4 stroke-[2px]" />
            </button>
            <div className="border-b border-border/40 pb-2">
              <h3 className="text-sm font-extrabold text-foreground">{activeLegal.title}</h3>
              <span className="text-[10px] text-primary font-bold">Play Store Compliant • Version 1.0</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {activeLegal.body}
            </p>
            <button
              onClick={() => setActiveLegal(null)}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

