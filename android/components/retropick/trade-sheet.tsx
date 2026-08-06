'use client'

import { useState } from 'react'
import { X, ShieldAlert, CheckCircle2, ArrowRight, Lock } from 'lucide-react'
import type { Market } from '@/lib/retropick-data'
import { cn } from '@/lib/utils'

const PRESETS = [10, 25, 50, 100]

export function TradeSheet({
  market,
  side: initialSide,
  balance = 1240.50,
  readOnly = false,
  eligible = true,
  onClose,
  onExecuteTrade,
}: {
  market: Market
  side: 'yes' | 'no'
  balance?: number
  readOnly?: boolean
  eligible?: boolean
  onClose: () => void
  onExecuteTrade?: (outcomeLabel: string, percentage: number, amount: number) => void
}) {
  const [side, setSide] = useState<'yes' | 'no'>(initialSide)
  const [amount, setAmount] = useState<number>(10)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const price = side === 'yes' ? market.yes : 100 - market.yes
  const sharePrice = price / 100
  const shares = sharePrice > 0 ? (amount / sharePrice).toFixed(1) : '0.0'
  const payout = amount > 0 ? (amount / sharePrice).toFixed(2) : '0.00'
  const profitAmount = amount > 0 ? (parseFloat(payout) - amount).toFixed(2) : '0.00'
  const profitPercentage = price > 0 ? Math.round(((100 - price) / price) * 100) : 0

  const handleOpenPreview = () => {
    setErrorMsg('')
    if (readOnly) {
      setErrorMsg('System is in Read-Only Mode. Upstream venue is currently unavailable.')
      return
    }
    if (!eligible) {
      setErrorMsg('Trading ineligible. Please verify account status or geo-compliance.')
      return
    }
    if (amount <= 0) {
      setErrorMsg('Please enter a valid trade amount')
      return
    }
    if (amount > balance) {
      setErrorMsg(`Insufficient balance. You have $${balance.toFixed(2)} USDC`)
      return
    }
    setShowPreview(true)
  }

  const handleFinalSubmit = () => {
    setIsSubmitting(true)
    setTimeout(() => {
      const label = side === 'yes' ? 'Yes / Up' : 'No / Down'
      onExecuteTrade?.(label, price, amount)
      setIsSubmitting(false)
      onClose()
    }, 600)
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        className="absolute inset-0 bg-black/75 transition-opacity"
        onClick={onClose}
        aria-label="Close modal overlay"
      />
      
      {!showPreview ? (
        /* STEP 1: ORDER CONFIGURATION SHEET */
        <div className="animate-sheet-up relative rounded-t-2xl border-t border-border bg-popover px-5 pb-7 pt-3.5 space-y-3.5">
          <div className="mx-auto h-1 w-10 rounded-full bg-border" />
          
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
              Quick Trade
              {readOnly && (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30">
                  <Lock className="h-3 w-3" /> Read-Only
                </span>
              )}
            </h2>
            <button onClick={onClose} aria-label="Close Quick Trade sheet" className="text-muted-foreground hover:text-foreground">
              <X className="h-4.5 w-4.5 stroke-[2px]" />
            </button>
          </div>

          <p className="text-xs font-semibold text-muted-foreground line-clamp-2">
            {market.question}
          </p>

          {/* Fail-Closed / Read-Only Warning Banner */}
          {(readOnly || !eligible) && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                {readOnly
                  ? 'Upstream venue is unavailable. Trading is disabled (Read-Only Mode).'
                  : 'Account eligibility unverified. Trading disabled (Fail-Closed protection).'}
              </span>
            </div>
          )}

          {/* Side toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide('yes')}
              disabled={readOnly || !eligible}
              aria-label={`Select Yes outcome at ${market.yes} cents`}
              className={cn(
                'rounded-md border py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                side === 'yes'
                  ? 'border-yes bg-yes-soft text-yes'
                  : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground',
              )}
            >
              Yes {market.yes}¢
            </button>
            <button
              onClick={() => setSide('no')}
              disabled={readOnly || !eligible}
              aria-label={`Select No outcome at ${100 - market.yes} cents`}
              className={cn(
                'rounded-md border py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                side === 'no'
                  ? 'border-no bg-no-soft text-no'
                  : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground',
              )}
            >
              No {100 - market.yes}¢
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Trade Amount (USDC)
            </label>
            <div className="flex items-center justify-between rounded-md border border-border bg-secondary/15 px-3.5 py-2.5">
              <input
                type="number"
                value={amount}
                disabled={readOnly || !eligible}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                aria-label="Enter trade amount in USDC"
                className="w-full bg-transparent text-xl font-black text-foreground outline-none disabled:opacity-50"
              />
              <span className="text-xs font-bold text-muted-foreground">
                USDC
              </span>
            </div>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                disabled={readOnly || !eligible}
                aria-label={`Set amount to ${p} USDC`}
                className="rounded-md border border-border bg-card py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setAmount(Math.floor(balance))}
              disabled={readOnly || !eligible}
              aria-label="Set maximum available balance"
              className="rounded-md border border-primary bg-primary py-1.5 text-xs font-bold text-primary-foreground active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              MAX
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-no">{errorMsg}</p>
          )}

          {/* Summary Card */}
          <div className="rounded-md border border-border/70 bg-secondary/10 p-3 space-y-1.5 text-xs">
            <h4 className="font-bold text-foreground border-b border-border/40 pb-1">Order Details</h4>
            <Row label="Price per Share" value={`${price}¢`} />
            <Row label="Shares" value={shares} />
            <Row label="Potential Return" value={`$${payout}`} highlight />
            <Row label="Potential Profit" value={`+$${profitAmount} (${profitPercentage}%)`} highlight />
          </div>

          {/* CTA Button -> Opens Preview Step */}
          <button 
            onClick={handleOpenPreview}
            disabled={readOnly || !eligible}
            aria-label="Preview and Review Order Before Signing"
            className="w-full rounded-md bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            Review & Preview Order <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* STEP 2: PREVIEW-BEFORE-SIGN MODAL */
        <div className="animate-sheet-up relative rounded-t-2xl border-t border-primary/40 bg-popover px-5 pb-7 pt-4 space-y-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-border" />
          
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Step 2 of 2</span>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                Preview Before Sign
              </h2>
            </div>
            <button onClick={() => setShowPreview(false)} aria-label="Back to order configuration" className="text-muted-foreground hover:text-foreground text-xs font-semibold underline">
              Back
            </button>
          </div>

          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-bold text-foreground line-clamp-2">
              {market.question}
            </p>
            <div className="flex items-center justify-between text-xs border-t border-border/40 pt-2">
              <span className="text-muted-foreground">Target Outcome:</span>
              <span className={cn('font-black uppercase', side === 'yes' ? 'text-yes' : 'text-no')}>
                {side === 'yes' ? 'YES / UP' : 'NO / DOWN'} ({price}¢)
              </span>
            </div>
          </div>

          {/* Detailed Transaction Breakdown */}
          <div className="rounded-md border border-border bg-card p-3.5 space-y-2 text-xs">
            <h4 className="font-bold text-foreground border-b border-border/40 pb-1.5">Signing Parameters</h4>
            <Row label="Order Amount" value={`$${amount.toFixed(2)} USDC`} />
            <Row label="Estimated Shares" value={shares} />
            <Row label="Venue / Execution" value="Polymarket CLOB V2" />
            <Row label="BFF Anti-Corruption Layer" value="Go BFF / Verified" />
            <Row label="Max Slippage Tolerance" value="0.50%" />
            <Row label="Est. Network Fee" value="$0.00 (Gasless)" />
            <div className="border-t border-border/60 pt-2 flex items-center justify-between">
              <span className="font-bold text-foreground">Potential Return</span>
              <span className="font-black text-yes text-sm">${payout} USDC</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-yes" /> Non-custodial transaction preview verified
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(false)}
              className="w-1/3 rounded-md border border-border bg-secondary/30 py-3 text-xs font-bold text-foreground hover:bg-secondary/50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              aria-label="Confirm and sign order"
              className="w-2/3 rounded-md bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Signing Order...' : 'Sign & Submit Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold',
          highlight ? 'text-yes' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}

