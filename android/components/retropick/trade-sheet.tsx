'use client'

import { useState } from 'react'
import { LimitOrderModal } from './limit-order-modal'
import { type Market, getSafeMarketImage } from '@/lib/retropick-data'

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

  const hasOptions = market.options && market.options.length > 0
  const firstOpt = hasOptions ? market.options![0] : null
  const initialOutcome = hasOptions ? firstOpt!.label : (side === 'yes' ? 'YES' : 'NO')
  const initialPrice = hasOptions ? firstOpt!.percentage : (side === 'yes' ? market.yes : 100 - market.yes)

  return (
    <LimitOrderModal
      isOpen={true}
      onClose={onClose}
      marketTitle={market.question}
      imageUrl={getSafeMarketImage(market)}
      initialOutcome={initialOutcome}
      initialSide={side === 'yes' ? 'BUY' : 'BUY'}
      initialPriceCents={initialPrice}
      onTradeSubmit={(tradeDetails) => {
        onExecuteTrade?.(
          tradeDetails.outcome,
          tradeDetails.limitPriceCents,
          tradeDetails.shares
        )
        onClose()
      }}
    />
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

