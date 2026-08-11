'use client'

import { useState } from 'react'
import { X, ArrowUpFromLine, CheckCircle2, ShieldCheck, Copy, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function WithdrawModal({
  open,
  onClose,
  balance,
  walletAddress,
  onWithdrawBalance,
}: {
  open: boolean
  onClose: () => void
  balance: number
  walletAddress: string
  onWithdrawBalance: (amount: number, targetAddress: string, chain: string) => void
}) {
  const [targetAddress, setTargetAddress] = useState('')
  const [amount, setAmount] = useState('50')
  const [selectedChain, setSelectedChain] = useState<'Polygon' | 'Base'>('Polygon')
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  if (!open) return null

  const numAmount = parseFloat(amount) || 0

  const handleWithdraw = () => {
    setErrorMsg('')
    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount')
      return
    }
    if (numAmount > balance) {
      setErrorMsg(`Insufficient USDC balance ($${balance.toFixed(2)} available)`)
      return
    }
    if (!targetAddress || targetAddress.length < 10) {
      setErrorMsg('Please enter a valid destination wallet address (0x...)')
      return
    }

    setStatus('processing')
    setTimeout(() => {
      onWithdrawBalance(numAmount, targetAddress, selectedChain)
      setStatus('success')
    }, 1200)
  }

  const handleClose = () => {
    setStatus('idle')
    setErrorMsg('')
    onClose()
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px] p-0 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Full-width edge-to-edge Bottom Sheet Drawer Container sitting flush on top of BottomNav */}
      <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border/80 bg-card p-5 pb-6 shadow-2xl space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto animate-slide-up">
        {/* Grab Handle Pill */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={handleClose} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-primary stroke-[2.2px]" />
            <h2 className="font-display text-base font-bold text-foreground">
              Withdraw USDC
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {status === 'success' ? (
          <div className="py-6 text-center space-y-3 animate-fade-in">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yes/20 text-yes border border-yes/40">
              <CheckCircle2 className="h-6 w-6 stroke-[2.5px]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-foreground">Withdrawal Submitted!</h3>
              <p className="text-xs text-muted-foreground">
                ${numAmount.toFixed(2)} USDC sent to {targetAddress.substring(0, 6)}...{targetAddress.substring(targetAddress.length - 4)} on {selectedChain}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Chain Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Network:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedChain('Polygon')}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all",
                    selectedChain === 'Polygon'
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  Polygon Mainnet
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedChain('Base')}
                  className={cn(
                    "py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all",
                    selectedChain === 'Base'
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Base Network
                </button>
              </div>
            </div>

            {/* Address Input */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Destination Address:</span>
              <input
                type="text"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x... (Recipient Wallet)"
                className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-muted-foreground uppercase tracking-wider">Amount (USDC):</span>
                <span className="font-mono text-foreground">Available: ${balance.toFixed(2)}</span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 pl-8 pr-16 font-mono text-base font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setAmount(balance.toFixed(0))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/30"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <p className="text-xs font-bold text-no bg-no/10 border border-no/20 rounded-lg p-2 text-center">
                {errorMsg}
              </p>
            )}

            {/* Breakdown */}
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 space-y-1.5 text-xs font-mono text-muted-foreground">
              <div className="flex justify-between">
                <span>Withdrawal Amount:</span>
                <strong className="text-foreground">${numAmount.toFixed(2)} USDC</strong>
              </div>
              <div className="flex justify-between">
                <span>Network Fee:</span>
                <strong className="text-yes">Gasless Relay ($0.00)</strong>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1.5 text-foreground font-bold">
                <span>Total Deducted:</span>
                <span>${numAmount.toFixed(2)} USDC</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={status === 'processing'}
              className="w-full rounded-xl bg-primary py-3 font-display text-xs font-black uppercase text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {status === 'processing' ? 'Processing Transaction...' : 'Confirm Withdrawal'}
              <ArrowRight className="h-4 w-4 stroke-[2px]" />
            </button>

            <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-yes" />
              <span>Non-Custodial Direct Settlement</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
