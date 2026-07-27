'use client'

import { ChevronLeft } from 'lucide-react'
import { MARKETS, type Market } from '@/lib/retropick-data'
import { MarketCard } from '../market-card'

const CATEGORY_NAMES: Record<string, string> = {
  'BTC': 'Bitcoin',
  'XRP': 'XRP',
  'fed': 'Fed',
  'inflation': 'Inflation',
  'growth': 'Growth',
  'stocks': 'Stocks',
  'bonds': 'Bonds',
  'banking': 'Banking',
  'football': 'Football',
  'f1': 'F1',
  'tennis': 'Tennis',
  'ai': 'AI',
  'space': 'Space',
  'tech': 'Tech',
  'gpt': 'GPT',
  'ml': 'ML Models',
  'temperature': 'Temperature',
  'emissions': 'Emissions',
}

export function CategoryDetailScreen({
  categoryValue,
  onBack,
  onOpenMarket,
}: {
  categoryValue: string
  onBack: () => void
  onOpenMarket: (m: Market) => void
}) {
  const getMarketsForCategory = (value: string): Market[] => {
    if (value === 'BTC') {
      return MARKETS.filter(m => m.icon === 'BTC')
    }
    if (value === 'XRP') {
      return MARKETS.filter(m => m.icon === 'XRP')
    }
    if (value === 'fed') {
      return MARKETS.filter(m => m.question.includes('Fed') || m.category === 'Economics')
    }
    // Add more category mappings as needed
    return MARKETS.slice(0, 6)
  }

  const markets = getMarketsForCategory(categoryValue)
  const categoryName = CATEGORY_NAMES[categoryValue] || categoryValue

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-5 py-3.5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="font-display text-base font-bold text-foreground">
          {categoryName}
        </h1>
      </div>

      {/* Markets List */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 pb-28 space-y-3">
        {markets.map((m) => (
          <MarketCard
            key={m.id}
            market={m}
            onClick={() => onOpenMarket(m)}
          />
        ))}
      </main>
    </div>
  )
}
