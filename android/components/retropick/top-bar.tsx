'use client'

import { Menu, Bell } from 'lucide-react'

export function TopBar({
  title,
  onMenu,
}: {
  title: string
  onMenu: () => void
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
      <button
        onClick={onMenu}
        className="flex items-center gap-2"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground" />
        <span className="font-display text-base font-bold text-foreground">
          {title}
        </span>
      </button>
      <button
        className="relative grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 transition-colors active:bg-secondary"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-foreground" />
        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-no" />
      </button>
    </header>
  )
}
