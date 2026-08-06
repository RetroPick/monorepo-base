'use client'

import { Compass, BarChart3, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'explore' | 'markets' | 'portfolio'

const ITEMS: { id: Tab; label: string; icon: typeof Compass }[] = [
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'markets', label: 'Markets', icon: BarChart3 },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
]

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-50 flex h-[92px] items-start justify-around border-t border-border bg-card/98 px-4 pt-2.5 pb-6 shadow-2xl">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-all cursor-pointer group active:scale-95"
          >
            <div
              className={cn(
                'flex items-center justify-center h-9.5 w-16 rounded-2xl transition-all duration-200',
                isActive
                  ? 'bg-primary/20 text-primary shadow-sm border border-primary/25'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            >
              <Icon className={cn('h-5.5 w-5.5 transition-transform duration-200', isActive ? 'stroke-[2.5px] scale-105' : 'stroke-[2px]')} />
            </div>
            <span
              className={cn(
                'text-[11px] transition-colors',
                isActive ? 'text-foreground font-extrabold tracking-tight' : 'text-muted-foreground font-semibold',
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
