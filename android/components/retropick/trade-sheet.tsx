'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Market } from '@/lib/retropick-data'
import { cn } from '@/lib/utils'

const PRESETS = [10, 25, 50, 100]

export function TradeSheet({
  market,
  side: initialSide,
  onClose,
}: {
  market: Market
  side: 'yes' | 'no'
  onClose: () => void
}) {
  const [side, setSide] = useState<'yes' | 'no'>(initialSide)
  const [amount, setAmount] = useState(10)

  const price = side === 'yes' ? market.yes / 100 : (100 - market.yes) / 100
  const shares = amount / price
  const payout = shares * 1
  const fee = amount * 0.01
  const profit = payout - amount - fee

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="animate-sheet-up relative rounded-t-[16px] border-t border-border bg-popover px-5 pb-7 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            Buy {side === 'yes' ? 'Yes' : 'No'}
          </h2>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {market.question}
        </p>

        {/* Side toggle */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-[10px] bg-muted p-1">
          <button
            onClick={() => setSide('yes')}
            className={cn(
              'rounded-[8px] py-2 text-sm font-semibold transition-colors',
              side === 'yes'
                ? 'bg-yes text-white'
                : 'text-muted-foreground',
            )}
          >
            Yes {market.yes}¢
          </button>
          <button
            onClick={() => setSide('no')}
            className={cn(
              'rounded-[8px] py-2 text-sm font-semibold transition-colors',
              side === 'no' ? 'bg-no text-white' : 'text-muted-foreground',
            )}
          >
            No {100 - market.yes}¢
          </button>
        </div>

        <p className="mt-4 text-xs font-medium text-muted-foreground">
          Amount
        </p>
        <div className="mt-1.5 flex items-center justify-between rounded-[10px] border border-border bg-card px-4 py-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full bg-transparent text-lg font-semibold text-foreground outline-none"
          />
          <span className="text-sm font-medium text-muted-foreground">
            USDC
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-5 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className="rounded-[8px] border border-border bg-card py-2 text-xs font-semibold text-foreground"
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setAmount(100)}
            className="rounded-[8px] border border-border bg-card py-2 text-xs font-semibold text-primary"
          >
            MAX
          </button>
        </div>

        <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-[13px]">
          <Row label="Shares you will receive" value={shares.toFixed(2)} />
          <Row
            label="Avg. Price"
            value={`${price.toFixed(2)} USDC`}
          />
          <Row
            label="Potential Payout"
            value={`${payout.toFixed(2)} USDC`}
          />
          <Row label="Fee (1%)" value={`${fee.toFixed(2)} USDC`} />
          <Row
            label="Potential Profit"
            value={`+${profit.toFixed(2)} USDC`}
            highlight
          />
        </dl>

        <button className="mt-5 w-full rounded-[10px] bg-blue py-3.5 text-sm font-bold text-blue-foreground transition-transform active:scale-[0.99]">
          Review Order
        </button>
      </div>
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-semibold',
          highlight ? 'text-yes' : 'text-foreground',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
