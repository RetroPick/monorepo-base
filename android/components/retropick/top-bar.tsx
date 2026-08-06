'use client'

import { useState, useEffect } from 'react'
import { PanelLeft, Bell, Wallet, Copy, LogOut, ShieldCheck, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tab = 'explore' | 'markets' | 'portfolio'

export function TopBar({
  title,
  onMenu,
  authenticated = false,
  walletConnected,
  walletAddress,
  walletProvider = '',
  userEmail,
  onConnect,
  onDisconnect,
  onProvisionWallet,
  onNotifications,
  hasUnread = false,
}: {
  title: string
  onMenu: () => void
  activeTab?: Tab
  onTabChange?: (t: Tab) => void
  authenticated?: boolean
  walletConnected: boolean
  walletAddress: string
  walletProvider?: string
  userEmail?: string
  onConnect: () => void
  onDisconnect: () => void
  onProvisionWallet?: (type: 'embedded' | 'external', extProvider?: string) => void
  onNotifications?: () => void
  hasUnread?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const displayProfile = userEmail && userEmail !== 'external-wallet'
    ? (userEmail.startsWith('@') 
        ? userEmail 
        : (userEmail.length > 15 
            ? `${userEmail.substring(0, 8)}...` 
            : userEmail))
    : (walletAddress
        ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
        : '')

  const isLiveConnected = mounted && walletConnected
  const isLiveAuth = mounted && authenticated

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex flex-col w-full border-b border-border bg-card/98 text-foreground shadow-xs">
      <div className="flex h-14 w-full items-center justify-between px-4 py-2">
        {/* Left: Sidebar toggle icon + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
          <button
            type="button"
            onClick={onMenu}
            className="flex items-center justify-center p-1 rounded-md text-foreground hover:bg-secondary/40 transition-colors"
            aria-label="Open menu"
          >
            <PanelLeft className="h-5 w-5 stroke-[2px]" />
          </button>

          <h1 className="font-display text-base font-bold text-foreground truncate">
            {title}
          </h1>
        </div>

        {/* Right: Wallet & Notifications */}
        <div className="flex items-center gap-2 relative shrink-0" suppressHydrationWarning>
          {isLiveConnected ? (
            <button
              type="button"
              onClick={() => setShowPopover(!showPopover)}
              className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-foreground hover:bg-primary/20 active:scale-95 transition-all truncate"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate">{displayProfile}</span>
            </button>
          ) : isLiveAuth ? (
            <button
              type="button"
              onClick={() => setShowPopover(!showPopover)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-secondary/60 active:scale-95 transition-all truncate"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0 animate-pulse" />
              <span className="truncate">{displayProfile}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Wallet className="h-3.5 w-3.5 stroke-[2px]" />
              Sign In
            </button>
          )}

          <button
            type="button"
            onClick={onNotifications}
            className="relative grid h-8.5 w-8.5 place-items-center rounded-md bg-secondary/50 border border-border/60 transition-colors hover:bg-secondary active:scale-95 shrink-0"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-foreground stroke-[2px]" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-no animate-pulse shadow-sm shadow-no/50" />
            )}
          </button>

          {showPopover && (authenticated || walletConnected) && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowPopover(false)} />
              <div className="absolute right-0 top-[calc(3.5rem+env(safe-area-inset-top,28px))] z-40 w-64 rounded-xl border border-border bg-card p-4 shadow-xl animate-fade-in space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Account Profile</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-black">
                      Base
                    </span>
                    <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-black tracking-wide">
                      {walletProvider === 'google' ? 'Google 🔑' : 
                       walletProvider === 'telegram' ? 'Telegram ✉️' :
                       walletProvider === 'twitter' ? 'Twitter 𝕏' :
                       walletProvider === 'apple' ? 'Apple 🍏' :
                       walletProvider === 'email' ? 'Email ✉️' : walletProvider.toUpperCase() || 'PRIVY'}
                    </span>
                  </div>
                </div>

                {/* Non-Custodial Signer Badge (WALLET_SIGNING_AND_SECURITY.md) */}
                <div className="rounded-lg border border-yes/30 bg-yes/10 p-2 flex items-center gap-2 text-[10px] font-bold text-yes">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>Non-Custodial Session Signer Active</span>
                </div>

                {userEmail && userEmail !== 'external-wallet' && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Identity</span>
                    <p className="text-xs font-bold text-foreground truncate select-all">{userEmail}</p>
                  </div>
                )}

                {walletConnected ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground">Wallet Address</span>
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Copy className="h-2.5 w-2.5 stroke-[2px]" />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate select-all">{walletAddress}</p>
                  </div>
                ) : (
                  <div className="space-y-2 border-t border-border/60 pt-2.5">
                    <p className="text-[9px] text-muted-foreground leading-relaxed">
                      Link a wallet or create a secure embedded wallet to execute trades.
                    </p>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onProvisionWallet?.('embedded')
                          setShowPopover(false)
                        }}
                        className="w-full text-center rounded-md bg-primary py-2 text-[10px] font-bold text-primary-foreground shadow shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
                      >
                        Create Embedded Wallet
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onDisconnect()
                    setShowPopover(false)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-md bg-no-soft border border-no/20 py-2 text-[10px] font-bold text-no hover:bg-no/20 active:scale-[0.99] transition-all mt-2"
                >
                  <LogOut className="h-3.5 w-3.5 stroke-[2px]" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
