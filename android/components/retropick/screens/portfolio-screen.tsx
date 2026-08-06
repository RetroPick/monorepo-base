'use client'

import { useState, useEffect } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Copy,
  User,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  FileText,
  CheckCircle2,
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
  const [copied, setCopied] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  if (!authenticated) {
    return (
      <div className="animate-fade-up flex flex-col justify-center items-center px-6 text-center h-[70vh] space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-card shadow-sm text-foreground mb-2">
          <User className="h-7 w-7 text-muted-foreground stroke-[2px]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Log In to view profile</h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
            Track your positions, trading stats, and transaction history
          </p>
        </div>
        <button
          onClick={onConnect}
          className="mt-4 rounded-md bg-primary text-primary-foreground px-7 py-2.5 text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          Log In
        </button>
      </div>
    )
  }

  const handleDepositClick = () => {
    if (!walletConnected) {
      onProvisionWallet?.('embedded')
    }
    onOpenAddFunds?.()
  }

  const handleCopyAddress = () => {
    if (walletConnected && walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyReferral = () => {
    const refUrl = `retropick.app/?ref=${walletConnected && walletAddress ? walletAddress : '0x23Cb836e35ed8213ad280a6D1F'}`
    navigator.clipboard.writeText(refUrl)
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }

  const positionsValue = positions.reduce((acc, pos) => {
    const val = parseFloat(pos.value.replace(/[^0-9.]/g, '')) || 0
    return acc + val
  }, 0)
  const totalValue = balance + positionsValue

  return (
    <div className="relative animate-fade-up space-y-4 px-5 pb-36 pt-4">
      {/* Balance Card */}
      <section className="overflow-hidden rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Net Worth</p>
          <span className="text-xs font-bold text-yes bg-yes-soft px-2 py-0.5 rounded-md border border-yes/20">
            +12.45%
          </span>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-black text-foreground">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs font-bold text-muted-foreground">USDC</span>
        </div>

        <MiniChart
          data={PERF}
          up
          width={330}
          height={70}
          strokeWidth={2.5}
          className="w-full pt-1"
        />

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button 
            onClick={handleDepositClick}
            className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <ArrowDownToLine className="h-4 w-4 stroke-[2px]" />
            Deposit
          </button>
          <button className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/30 py-2 text-xs font-bold text-foreground hover:bg-secondary/50 active:scale-[0.99] transition-all">
            <ArrowUpFromLine className="h-4 w-4 stroke-[2px]" />
            Withdraw
          </button>
        </div>
      </section>

      {/* Performance Statistic Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total P&L', value: '+$138.20', isPositive: true },
          { label: 'Win Rate', value: '64%', isPositive: false },
          { label: 'Positions', value: positions.length.toString(), isPositive: false },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-md border border-border bg-card p-2.5 text-center space-y-0.5"
          >
            <p className="text-xs font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] font-medium text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Wallet Address & Referral Card */}
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wallet Address</p>
            <p className="font-mono text-xs font-semibold text-foreground">
              {walletConnected && walletAddress 
                ? `${walletAddress.substring(0, 8)}...${walletAddress.substring(walletAddress.length - 4)}` 
                : '0x23C5b64c...E300'}
            </p>
          </div>
          <button 
            onClick={handleCopyAddress}
            className="rounded-md bg-secondary/30 p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            aria-label="Copy wallet address"
          >
            {copied ? <Check className="h-4 w-4 text-yes stroke-[2px]" /> : <Copy className="h-4 w-4 stroke-[2px]" />}
          </button>
        </div>

        <div className="h-[1px] w-full bg-border/40" />

        <div className="flex items-center justify-between text-xs">
          <div className="space-y-0.5 min-w-0 flex-1 pr-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referral Link</p>
            <p className="font-mono text-xs font-medium text-muted-foreground truncate">
              retropick.app/?ref={walletConnected && walletAddress ? walletAddress : '0x23Cb836e35ed8213ad280a6D1F'}
            </p>
          </div>
          <button 
            onClick={handleCopyReferral}
            className="rounded-md bg-secondary/30 p-1.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all shrink-0"
            aria-label="Copy referral link"
          >
            {copiedRef ? <Check className="h-4 w-4 text-yes stroke-[2px]" /> : <Copy className="h-4 w-4 stroke-[2px]" />}
          </button>
        </div>
      </div>

      {/* Open Positions */}
      <section className="space-y-2">
        <SectionHeader title="Open Positions" action="See all" />
        <div className="space-y-2">
          {positions.length > 0 ? (
            positions.map((p) => (
              <div
                key={`${p.id}-${p.side}`}
                className="rounded-xl border border-border bg-card p-3 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-bold leading-snug text-foreground">
                    {p.question}
                  </p>
                  <span className="shrink-0 text-xs font-bold text-foreground">
                    {p.value}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {p.meta}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-yes-soft px-1.5 py-0.5 text-[10px] font-bold text-yes">
                      {p.side} {p.prob}%
                    </span>
                    <span className="text-[11px] font-bold text-yes">
                      {p.pnl}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
              No open positions. Select a market and place a trade to start!
            </div>
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-2">
        <SectionHeader title="Recent Activity" action="See all" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {activity.length > 0 ? (
            activity.map((a, i) => (
              <div
                key={`${a.label}-${i}`}
                className={`flex items-center justify-between p-3 ${
                  i !== activity.length - 1 ? 'border-b border-border/40' : ''
                }`}
              >
                <div className="min-w-0 flex-1 pr-3 space-y-0.5">
                  <p className="text-xs font-bold text-foreground truncate">
                    {a.label}
                  </p>
                  <p className="text-[10px] font-medium text-muted-foreground">{a.time}</p>
                </div>
                <span
                  className={`text-xs font-bold shrink-0 ${
                    a.up ? 'text-yes' : 'text-no'
                  }`}
                >
                  {a.amount}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-5 text-muted-foreground text-xs">
              No transactions logged yet.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
