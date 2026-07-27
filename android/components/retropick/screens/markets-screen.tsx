'use client'

import { useState } from 'react'
import { MARKETS, type Market } from '@/lib/retropick-data'
import { CategoryChips } from '../ui-bits'
import { MarketCard } from '../market-card'

const FILTERS = [
  'Trending',
  'Crypto',
  'Economics',
  'Financials',
  'Sport',
  'Tech & Science',
  'AI',
  'Climate',
]

export function MarketsScreen({
  onOpenMarket,
}: {
  onOpenMarket: (m: Market) => void
}) {
  const [filter, setFilter] = useState('Trending')

  const trendingMarkets = MARKETS.slice(0, 3)
  
  const getCategoriesForFilter = (filterName: string): string[] => {
    const categoryMap: Record<string, string[]> = {
      'Crypto': ['Crypto'],
      'Economics': ['Economics'],
      'Financials': ['Finance'],
      'Sport': ['Sports'],
      'Tech & Science': ['Tech', 'Science'],
      'AI': ['AI'],
      'Climate': ['Climate'],
    }
    return categoryMap[filterName] || []
  }

  const getMarketsForFilter = (filterName: string) => {
    if (filterName === 'Trending') return MARKETS
    const categories = getCategoriesForFilter(filterName)
    return MARKETS.filter(m => categories.includes(m.category))
  }

  const list = getMarketsForFilter(filter)

  return (
    <div className="animate-fade-up flex flex-col pb-28">
      <div className="space-y-4 px-5 pt-4">
        {/* Filter */}
        <CategoryChips items={FILTERS} active={filter} onSelect={setFilter} />

        {/* Markets */}
        <div className="space-y-2">
          {list.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              onClick={() => onOpenMarket(m)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
