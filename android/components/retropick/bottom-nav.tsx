'use client'

import { Compass, BarChart3, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'explore' | 'markets' | 'portfolio'

const ITEMS: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'markets', label: 'Markets', icon: BarChart3 },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 flex h-[72px] items-center justify-around border-t border-border bg-card">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
