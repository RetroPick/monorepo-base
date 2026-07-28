'use client'

import { useState } from 'react'
import { MARKETS, type Market } from '@/lib/retropick-data'
import { MarketCard } from '../market-card'
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

export function MarketsScreen({
  onOpenMarket,
  markets = MARKETS,
}: {
  onOpenMarket: (m: Market) => void
  markets?: Market[]
}) {
  const [filter, setFilter] = useState('Trending')

  const getMarketsForFilter = (filterName: string) => {
    if (filterName === 'Trending') return markets
    const typeMap: Record<string, string> = {
      'DIRECTION': 'UP_OR_DOWN',
      'THRESHOLD': 'THRESHOLD',
      'RANGE': 'RANGE',
      'MULTIPLE_CHOICE': 'MULTIPLE_CHOICE',
      'LADDER': 'LADDER',
      'VELOCITY': 'VELOCITY',
      'DATE': 'DATE',
      'CONVERGENCE': 'CONVERGENCE',
    }
    const targetType = typeMap[filterName]
    return markets.filter(m => m.marketType === targetType)
  }

  const list = getMarketsForFilter(filter)

  return (
    <div className="animate-fade-up flex flex-col pb-28">
      <div className="space-y-5 px-5 pt-5">


        {/* Polymarket Collapse Icon Tab Bar (active: icon + label, inactive: icon only) */}
        <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 py-1 border-t border-b border-border/40 bg-secondary/5">
          {FILTERS.map((f) => {
            const Icon = f.icon
            const isActive = filter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 shrink-0 rounded-full py-1.5 px-3 text-xs font-bold transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.02]"
                    : "border border-border bg-card/60 text-muted-foreground hover:bg-card active:scale-[0.98]"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {isActive && (
                  <span className="whitespace-nowrap transition-all duration-300">
                    {f.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Markets List */}
        <div className="space-y-3 mt-2">
          {list.length > 0 ? (
            list.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                onClick={() => onOpenMarket(m)}
              />
            ))
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No markets found for this type.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
