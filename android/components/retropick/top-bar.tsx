'use client'

import { useState } from 'react'
import { Menu, Bell, Wallet, Copy, LogOut } from 'lucide-react'

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
}: {
  title: string
  onMenu: () => void
  authenticated?: boolean
  walletConnected: boolean
  walletAddress: string
  walletProvider?: string
  userEmail?: string
  onConnect: () => void
  onDisconnect: () => void
  onProvisionWallet?: (type: 'embedded' | 'external', extProvider?: string) => void
  onNotifications?: () => void
}) {
  const [showPopover, setShowPopover] = useState(false)
  const [copied, setCopied] = useState(false)

  const displayProfile = userEmail && userEmail !== 'external-wallet'
    ? (userEmail.startsWith('@') 
        ? userEmail 
        : (userEmail.length > 15 
            ? `${userEmail.substring(0, 8)}...` 
            : userEmail))
    : (walletAddress
        ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
        : '')

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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

      <div className="flex items-center gap-2 relative">
        {/* Wallet Connection / Social Identity Status */}
        {walletConnected ? (
          <button
            onClick={() => setShowPopover(!showPopover)}
            className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-primary/10 active:scale-95 transition-all truncate"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span className="truncate">{displayProfile}</span>
          </button>
        ) : authenticated ? (
          <button
            onClick={() => setShowPopover(!showPopover)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/30 px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-secondary/40 active:scale-95 transition-all truncate"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-muted shrink-0 animate-pulse" />
            <span className="truncate">{displayProfile}</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Wallet className="h-3 w-3" />
            Sign In
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

        {/* Profile Dropdown Popover */}
        {showPopover && (authenticated || walletConnected) && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowPopover(false)} />
            <div className="absolute right-0 top-10 z-40 w-64 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Account Profile</span>
                <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-black tracking-wide">
                  {walletProvider === 'google' ? 'Google 🔑' : 
                   walletProvider === 'telegram' ? 'Telegram ✉️' :
                   walletProvider === 'twitter' ? 'Twitter 𝕏' :
                   walletProvider === 'apple' ? 'Apple 🍏' :
                   walletProvider === 'email' ? 'Email ✉️' : walletProvider.toUpperCase() || 'PRIVY'}
                </span>
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
                      onClick={handleCopyAddress}
                      className="text-[9px] font-bold text-primary hover:underline flex items-center gap-0.5"
                    >
                      <Copy className="h-2.5 w-2.5" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground truncate select-all">{walletAddress}</p>
                </div>
              ) : (
                <div className="space-y-2 border-t border-border/60 pt-2.5">
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    Link a wallet or create a secure embedded wallet to deposit funds and execute forecasting trades.
                  </p>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        onProvisionWallet?.('embedded')
                        setShowPopover(false)
                      }}
                      className="w-full text-center rounded-lg bg-primary py-1.5 text-[10px] font-bold text-primary-foreground shadow shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      Create Embedded Wallet
                    </button>
                    <button
                      onClick={() => {
                        onConnect()
                        setShowPopover(false)
                      }}
                      className="w-full text-center rounded-lg border border-border bg-secondary/35 py-1.5 text-[10px] font-bold text-foreground hover:bg-secondary/60 active:scale-[0.99] transition-all"
                    >
                      Link External Wallet
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  onDisconnect()
                  setShowPopover(false)
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-no-soft/20 border border-no/10 py-1.5 text-[10px] font-bold text-no hover:bg-no-soft/40 active:scale-[0.99] transition-all mt-2"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
