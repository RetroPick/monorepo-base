'use client'

import { Menu, Bell, Wallet } from 'lucide-react'

export function TopBar({
  title,
  onMenu,
  walletConnected,
  walletAddress,
  onConnect,
  onNotifications,
}: {
  title: string
  onMenu: () => void
  walletConnected: boolean
  walletAddress: string
  onConnect: () => void
  onNotifications?: () => void
}) {
  const truncatedAddress = walletAddress
    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
    : ''

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-5 py-3.5">
      <button
        onClick={onMenu}
        className="flex items-center gap-2 max-w-[50%] min-w-0"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-foreground shrink-0" />
        <span className="font-display text-base font-bold text-foreground truncate">
          {title}
        </span>
      </button>

      <div className="flex items-center gap-2">
        {/* Wallet Connection Status */}
        {walletConnected ? (
          <div className="flex items-center gap-1.5 rounded-full border border-yes/20 bg-yes/5 px-2.5 py-1 text-[11px] font-bold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-yes shrink-0" />
            <span className="font-mono">{truncatedAddress}</span>
          </div>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Wallet className="h-3 w-3" />
            Connect
          </button>
        )}

        <button
          onClick={onNotifications}
          className="relative grid h-8 w-8 place-items-center rounded-lg bg-secondary/60 transition-colors active:bg-secondary shrink-0"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-foreground" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-no" />
        </button>
      </div>
    </header>
  )
}
