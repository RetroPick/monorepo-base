'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SearchBar({
  placeholder = 'Search markets, events, categories...',
  value = '',
  onChange,
  onClear,
  onSubmit,
}: {
  placeholder?: string
  value?: string
  onChange?: (v: string) => void
  onClear?: () => void
  onSubmit?: () => void
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      className="flex items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 py-2.5 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30"
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  )
}

export function CategoryChips({
  items,
  active,
  onSelect,
}: {
  items: string[]
  active: string
  onSelect: (v: string) => void
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
      {items.map((item) => {
        const isActive = item === active
        return (
          <button
            key={item}
            onClick={() => onSelect(item)}
            className={cn(
              'shrink-0 rounded-[10px] px-4 py-1.5 text-xs font-semibold transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground',
            )}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-[15px] font-semibold text-foreground">
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-medium text-blue"
        >
          {action}
        </button>
      )}
    </div>
  )
}
