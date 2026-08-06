'use client'

import { useState, useMemo, useEffect } from 'react'
import { MARKETS, type Market } from '@/lib/retropick-data'
import { MarketCard } from '../market-card'
import { SearchBar } from '../ui-bits'
import { cn } from '@/lib/utils'
import {
  Flame,
  ArrowUpDown,
  CircleDot,
  SlidersHorizontal,
  ListTodo,
  AlignEndHorizontal,
  Gauge,
  Calendar,
  Waypoints,
  X,
  Search,
} from 'lucide-react'

const FILTERS = [
  { id: 'Trending', label: 'Trending', icon: Flame },
  { id: 'DIRECTION', label: 'Direction', icon: ArrowUpDown },
  { id: 'THRESHOLD', label: 'Threshold', icon: CircleDot },
  { id: 'RANGE', label: 'Range', icon: SlidersHorizontal },
  { id: 'MULTIPLE_CHOICE', label: 'Multiple Choice', icon: ListTodo },
  { id: 'LADDER', label: 'Ladder', icon: AlignEndHorizontal },
  { id: 'VELOCITY', label: 'Velocity', icon: Gauge },
  { id: 'DATE', label: 'Date', icon: Calendar },
  { id: 'CONVERGENCE', label: 'Convergence', icon: Waypoints },
]

function matchesWord(text: string, keyword: string): boolean {
  if (!text || !keyword) return false
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

function matchesExactOrWord(list: string[], query: string): boolean {
  return list.some((item) => {
    const itemLower = (item || '').toLowerCase()
    return itemLower === query || matchesWord(itemLower, query)
  })
}

export function MarketsScreen({
  onOpenMarket,
  markets = MARKETS,
  selectedCategory,
  onClearCategory,
}: {
  onOpenMarket: (m: Market) => void
  markets?: Market[]
  selectedCategory?: string | null
  onClearCategory?: () => void
}) {
  const [filter, setFilter] = useState('Trending')

  const activeQuery = (selectedCategory || '').toLowerCase().trim()

  const list = useMemo(() => {
    let result = [...markets]

    // 1. Filter by search query / selected category or subcategory
    if (activeQuery !== '') {
      result = result.filter((m) => {
        const cat = (m.category || '').toLowerCase()
        const q = (m.question || '').toLowerCase()
        const type = (m.marketType || '').toLowerCase()
        const options = (m.options || []).map((o) => o.label.toLowerCase())
        const tags = (m.tags || []).map((t) => t.toLowerCase())

        const tagsMatch = matchesExactOrWord(tags, activeQuery)
        const optionsMatch = matchesExactOrWord(options, activeQuery)

        // Exact Category Match
        if (cat === activeQuery) {
          return true
        }

        // Specific Keyword Rule: "nfl"
        if (activeQuery === 'nfl') {
          return (
            matchesWord(q, 'nfl') ||
            matchesWord(q, 'super bowl') ||
            matchesWord(q, 'eagles') ||
            matchesWord(q, 'chiefs') ||
            matchesWord(q, 'patriots') ||
            matchesWord(q, 'packers') ||
            matchesWord(q, '49ers') ||
            tagsMatch ||
            optionsMatch
          )
        }

        // Specific Keyword Rule: "fed" / "fed & rates" / "federal reserve" / "fomc"
        if (
          activeQuery === 'fed' ||
          activeQuery === 'fed & rates' ||
          activeQuery === 'federal reserve' ||
          activeQuery === 'fomc'
        ) {
          return (
            matchesWord(q, 'fed') ||
            matchesWord(q, 'fomc') ||
            matchesWord(q, 'powell') ||
            matchesWord(q, 'federal reserve') ||
            (matchesWord(q, 'rate') && (cat === 'economics' || cat === 'finance')) ||
            tagsMatch ||
            optionsMatch
          )
        }

        // Specific Keyword Rule: "btc" / "bitcoin"
        if (activeQuery === 'btc' || activeQuery === 'bitcoin') {
          return matchesWord(q, 'btc') || matchesWord(q, 'bitcoin') || tagsMatch || optionsMatch
        }

        // Specific Keyword Rule: "eth" / "ethereum"
        if (activeQuery === 'eth' || activeQuery === 'ethereum') {
          return matchesWord(q, 'eth') || matchesWord(q, 'ethereum') || tagsMatch || optionsMatch
        }

        // Specific Keyword Rule: "sol" / "solana"
        if (activeQuery === 'sol' || activeQuery === 'solana') {
          return matchesWord(q, 'sol') || matchesWord(q, 'solana') || tagsMatch || optionsMatch
        }

        // Specific Keyword Rule: "xrp"
        if (activeQuery === 'xrp') {
          return matchesWord(q, 'xrp') || tagsMatch || optionsMatch
        }

        // Specific Keyword Rule: "f1" / "formula 1"
        if (activeQuery === 'f1' || activeQuery === 'formula 1') {
          return (
            matchesWord(q, 'f1') ||
            matchesWord(q, 'formula 1') ||
            matchesWord(q, 'verstappen') ||
            matchesWord(q, 'norris') ||
            tagsMatch ||
            optionsMatch
          )
        }

        // Specific Keyword Rule: "openai" / "gpt" / "chatgpt"
        if (activeQuery === 'openai' || activeQuery === 'gpt' || activeQuery === 'chatgpt') {
          return (
            matchesWord(q, 'openai') ||
            matchesWord(q, 'gpt') ||
            matchesWord(q, 'chatgpt') ||
            tagsMatch ||
            optionsMatch
          )
        }

        // Specific Keyword Rule: "ev" / "electric vehicles"
        if (activeQuery === 'ev' || activeQuery === 'electric vehicles') {
          return matchesWord(q, 'ev') || matchesWord(q, 'tesla') || matchesWord(q, 'byd') || tagsMatch || optionsMatch
        }

        // Fallback for general search queries
        return (
          matchesWord(cat, activeQuery) ||
          matchesWord(q, activeQuery) ||
          (activeQuery.length >= 4 && q.includes(activeQuery)) ||
          tagsMatch ||
          optionsMatch ||
          type.includes(activeQuery)
        )
      })
    }

    // 2. Filter by Polymarket market type filter (Direction, Range, Threshold, etc.)
    if (filter !== 'Trending') {
      const typeMap: Record<string, string> = {
        DIRECTION: 'UP_OR_DOWN',
        THRESHOLD: 'THRESHOLD',
        RANGE: 'RANGE',
        MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
        LADDER: 'LADDER',
        VELOCITY: 'VELOCITY',
        DATE: 'DATE',
        CONVERGENCE: 'CONVERGENCE',
      }
      const targetType = typeMap[filter]
      if (targetType) {
        result = result.filter((m) => m.marketType === targetType)
      }
    }

    return result
  }, [markets, activeQuery, filter])

  return (
    <div className="animate-fade-up flex flex-col pb-36">
      <div className="space-y-3 px-4 pt-1">
        {/* Polymarket-style Filter Tab Bar */}
        <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-border/60 bg-background">
          {FILTERS.map((f) => {
            const Icon = f.icon
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'flex h-9 items-center justify-center gap-2 shrink-0 transition-all duration-150 cursor-pointer rounded-xl border text-xs font-bold shadow-none my-auto',
                  isActive
                    ? 'border-border/60 bg-secondary/80 text-foreground px-3.5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/30 px-2.5',
                )}
                aria-label={f.label}
              >
                <Icon
                  className={cn(
                    'shrink-0 stroke-[2px]',
                    isActive ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground',
                  )}
                />
                {isActive && (
                  <span className="whitespace-nowrap font-display text-xs font-extrabold leading-none">
                    {f.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Natural Flow Markets List */}
        <div className="space-y-3 mt-1">
          {list.length > 0 ? (
            list.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                onClick={() => onOpenMarket(m)}
              />
            ))
          ) : (
            <div className="text-center py-12 px-4 rounded-2xl border border-border/60 bg-card/50 space-y-3">
              <p className="text-xs font-bold text-foreground">
                No markets found matching "{selectedCategory}"
              </p>
              <p className="text-[11px] text-muted-foreground">
                Try searching for a different term in the sidebar like "Fed", "Bitcoin", "F1", or "AI".
              </p>
              {onClearCategory && (
                <button
                  type="button"
                  onClick={onClearCategory}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
                >
                  View All Markets
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
