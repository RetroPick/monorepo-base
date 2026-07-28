'use client'

import { useState, useEffect } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  Gift,
  Star,
  ChevronRight,
  Wallet,
} from 'lucide-react'
import { MiniChart } from '../mini-chart'
import { SectionHeader } from '../ui-bits'

const PERF = [
  30, 32, 31, 35, 34, 38, 42, 40, 45, 48, 52, 50, 55, 60, 58, 63, 67, 65, 70,
  74, 78, 82, 88, 92,
]

export function PortfolioScreen({
  balance,
  positions,
  activity,
  authenticated = false,
  walletConnected,
  onConnect,
  onOpenAddFunds,
  onProvisionWallet,
  walletAddress,
}: {
  balance: number
  positions: any[]
  activity: any[]
  authenticated?: boolean
  walletConnected: boolean
  onConnect: () => void
  onOpenAddFunds?: () => void
  onProvisionWallet?: (type: 'embedded' | 'external', extProvider?: string) => void
  walletAddress?: string
}) {
  const [provisioning, setProvisioning] = useState(false)
  const [showLinkPrompt, setShowLinkPrompt] = useState(false)
  const [autoOpenDeposit, setAutoOpenDeposit] = useState(false)
  const [copied, setCopied] = useState(false)

  // Auto-open AddFunds deposit sheet after wallet gets linked
  useEffect(() => {
    if (walletConnected && autoOpenDeposit) {
      setAutoOpenDeposit(false)
      onOpenAddFunds?.()
    }
  }, [walletConnected, autoOpenDeposit, onOpenAddFunds])

  // 1. Locked state when not logged in
  if (!authenticated) {
    return (
      <div className="animate-fade-up flex flex-col justify-center items-center px-6 text-center h-[70vh]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-3xl animate-pulse mb-6">
          🔒
        </div>
        <h2 className="text-lg font-black text-foreground">Sign In Required</h2>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[280px]">
          Please sign in using your Google, Telegram, Twitter, Apple accounts, or email to access your trading portfolio and load funds.
        </p>
        <button
          onClick={onConnect}
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <Wallet className="h-4 w-4 shrink-0" />
          Sign In with Privy
        </button>
      </div>
    )
  }

  // Handle deposit click (decoupled wallet validation)
  const handleDepositClick = () => {
    if (walletConnected) {
      onOpenAddFunds?.()
    } else {
      setAutoOpenDeposit(true)
      setShowLinkPrompt(true)
    }
  }

  const handleCopyAddress = () => {
    if (walletConnected && walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Calculate total portfolio net worth dynamically
  const positionsValue = positions.reduce((acc, pos) => {
    const val = parseFloat(pos.value.replace(/[^0-9.]/g, '')) || 0
    return acc + val
  }, 0)
  const totalValue = balance + positionsValue

  return (
    <div className="animate-fade-up space-y-6 px-5 pb-28 pt-4">
      {/* Balance card */}
      <section className="overflow-hidden rounded-[12px] border border-border bg-gradient-to-br from-blue/20 via-card to-card p-4">
        <p className="text-xs text-muted-foreground">Total Net Worth</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-foreground">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            USDC
          </span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs font-semibold text-yes">+12.45% (24h)</p>
          <p className="text-[10px] text-muted-foreground">
            Wallet Cash: <strong className="text-foreground">${walletConnected ? balance.toFixed(2) : '0.00'} USDC</strong>
          </p>
        </div>

        <MiniChart
          data={PERF}
          up
          width={320}
          height={70}
          strokeWidth={2.5}
          className="mt-3 w-full"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button 
            onClick={handleDepositClick}
            className="flex items-center justify-center gap-1.5 rounded-[10px] bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <ArrowDownToLine className="h-4 w-4" />
            Deposit
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card py-2.5 text-sm font-semibold text-foreground active:scale-[0.99] transition-all">
            <ArrowUpFromLine className="h-4 w-4" />
            Withdraw
          </button>
        </div>
      </section>

      {/* Wallet address copy row */}
      <button 
        onClick={() => {
          if (!walletConnected) {
            setShowLinkPrompt(true)
          } else {
            handleCopyAddress()
          }
        }}
        className="flex w-full items-center justify-between rounded-[12px] border border-border bg-card p-3.5 hover:bg-card/75 active:scale-[0.99] transition-all"
      >
        <div className="text-left">
          <p className="text-[11px] text-muted-foreground">Wallet Address</p>
          <p className="mt-0.5 text-[13px] font-medium text-foreground truncate max-w-[200px] font-mono">
            {walletConnected && walletAddress 
              ? `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 4)}` 
              : 'Not Linked (Tap to Activate) ❌'}
          </p>
        </div>
        <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>

      {/* Wallet Activation Sheet Popover */}
      {showLinkPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowLinkPrompt(false)} />
          
          <div className="relative w-full max-w-md rounded-t-2xl border-t border-border bg-card p-6 shadow-2xl animate-slide-up space-y-4 pb-10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground">Activate Web3 Account</h3>
              <button 
                onClick={() => setShowLinkPrompt(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground shrink-0"
              >
                Cancel
              </button>
            </div>

            {provisioning ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                  Provisioning secure cryptographic keys via Privy...
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  A Web3 wallet is required to deposit funds and execute automated forecasting trades.
                </p>
                
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 text-left">
                  <h4 className="text-[11px] font-bold text-foreground">Create Privy Embedded Wallet</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-normal">
                    Instant secure activation. No browser extension needed.
                  </p>
                  <button
                    onClick={() => {
                      setProvisioning(true)
                      setTimeout(() => {
                        setProvisioning(false)
                        setShowLinkPrompt(false)
                        onProvisionWallet?.('embedded')
                      }, 1500)
                    }}
                    className="mt-2.5 w-full rounded-md bg-primary py-1.5 text-center text-[10px] font-bold text-primary-foreground hover:scale-[1.01] transition-all"
                  >
                    Activate Privy Wallet
                  </button>
                </div>

                <div className="rounded-lg border border-border bg-secondary/20 p-3.5 text-left">
                  <h4 className="text-[11px] font-bold text-foreground">Connect External Web3 Wallet</h4>
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-normal">
                    Link MetaMask, Coinbase Wallet, or Trust Wallet.
                  </p>
                  <button
                    onClick={() => {
                      setShowLinkPrompt(false)
                      onConnect()
                    }}
                    className="mt-2.5 w-full rounded-md border border-border bg-card py-1.5 text-center text-[10px] font-bold text-foreground hover:bg-secondary/40 transition-all"
                  >
                    Connect Web3 Client
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total P&L', value: '+$138.20' },
          { label: 'Win Rate', value: '64%' },
          { label: 'Positions', value: positions.length.toString() },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-[12px] border border-border bg-card p-3 text-center"
          >
            <p className="text-sm font-bold text-foreground">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Open positions */}
      <section className="space-y-3">
        <SectionHeader title="Open Positions" action="See all" />
        <div className="space-y-2.5">
          {positions.length > 0 ? (
            positions.map((p) => (
              <div
                key={`${p.id}-${p.side}`}
                className="rounded-[12px] border border-border bg-card p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-medium leading-snug text-foreground">
                    {p.question}
                  </p>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {p.value}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {p.meta}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-yes-soft px-1.5 py-0.5 text-[10px] font-semibold text-yes">
                      {p.side} {p.prob}%
                    </span>
                    <span className="text-[11px] font-semibold text-yes">
                      {p.pnl}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              No open positions. Select a market and place a trade to start!
            </div>
          )}
        </div>
      </section>

      {/* Recent activity */}
      <section className="space-y-3">
        <SectionHeader title="Recent Activity" action="See all" />
        <div className="rounded-[12px] border border-border bg-card">
          {activity.length > 0 ? (
            activity.map((a, i) => (
              <div
                key={`${a.label}-${i}`}
                className={`flex items-center justify-between p-3.5 ${
                  i !== activity.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="text-[13px] font-medium text-foreground truncate">
                    {a.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{a.time}</p>
                </div>
                <span
                  className={`text-[13px] font-semibold shrink-0 ${
                    a.up ? 'text-yes' : 'text-no'
                  }`}
                >
                  {a.amount}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground text-xs">
              No transactions logged yet.
            </div>
          )}
        </div>
      </section>

      {/* Watchlist + Referral */}
      <div className="grid grid-cols-1 gap-3">
        <button className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-primary/15">
            <Star className="h-4 w-4 text-primary" />
          </span>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-medium text-foreground">Watchlist</p>
            <p className="text-[11px] text-muted-foreground">
              5 markets tracked
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="flex items-center gap-3 rounded-[12px] border border-border bg-card p-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-blue/15">
            <Gift className="h-4 w-4 text-blue" />
          </span>
          <div className="flex-1 text-left">
            <p className="text-[13px] font-medium text-foreground">
              Referral Program
            </p>
            <p className="text-[11px] text-muted-foreground">
              Earn 10 USDC per invite
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
