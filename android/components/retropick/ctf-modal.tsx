'use client'

import { useState } from 'react'
import { X, Layers, ArrowDownUp, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { ctfService } from '@/lib/ctf-service'
import { cn } from '@/lib/utils'

export function CTFModal({
  open,
  onClose,
  balance,
  onUpdateBalance,
}: {
  open: boolean
  onClose: () => void
  balance: number
  onUpdateBalance: (newBal: number) => void
}) {
  const [activeTab, setActiveTab] = useState<'split' | 'merge'>('split')
  const [amount, setAmount] = useState('50')
  const [successMsg, setSuccessMsg] = useState('')

  if (!open) return null

  const numAmount = parseFloat(amount) || 0
  const splitPreview = ctfService.previewSplit(numAmount)
  const mergePreview = ctfService.previewMerge(numAmount)

  const handleAction = () => {
    if (numAmount <= 0) return

    if (activeTab === 'split') {
      if (numAmount > balance) {
        setSuccessMsg('Insufficient USDC collateral balance')
        return
      }
      onUpdateBalance(balance - numAmount)
      setSuccessMsg(`Successfully split $${numAmount} USDC into ${numAmount} YES + ${numAmount} NO tokens!`)
    } else {
      onUpdateBalance(balance + numAmount)
      setSuccessMsg(`Successfully merged ${numAmount} YES + ${numAmount} NO tokens back into $${numAmount} USDC collateral!`)
    }

    setTimeout(() => {
      setSuccessMsg('')
    }, 4000)
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-xs animate-fade-in" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/80 bg-card p-5 shadow-2xl space-y-4 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary stroke-[2.2px]" />
            <h2 className="font-display text-base font-bold text-foreground">
              CTF Collateral Operations
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Operation Mode Tabs */}
        <div className="grid grid-cols-2 rounded-xl bg-secondary/50 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => { setActiveTab('split'); setSuccessMsg(''); }}
            className={cn(
              "py-1.5 text-xs font-extrabold rounded-lg transition-all",
              activeTab === 'split' ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ✂️ Split USDC
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('merge'); setSuccessMsg(''); }}
            className={cn(
              "py-1.5 text-xs font-extrabold rounded-lg transition-all",
              activeTab === 'merge' ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground"
            )}
          >
            🔄 Merge Tokens
          </button>
        </div>

        {/* Input Form */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{activeTab === 'split' ? 'Collateral Amount (USDC)' : 'Token Shares (YES + NO)'}</span>
            <span className="font-mono">Balance: <strong>${balance.toFixed(2)}</strong></span>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/30 py-2.5 pl-8 pr-16 font-mono text-base font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="50"
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

        {/* Outcome Preview Breakdown */}
        <div className="rounded-xl border border-border/70 bg-secondary/20 p-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-muted-foreground">
            <span>Output YES Tokens:</span>
            <strong className="text-yes">+{activeTab === 'split' ? splitPreview.yesTokensOutput : mergePreview.yesTokensInput} Shares</strong>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Output NO Tokens:</span>
            <strong className="text-no">+{activeTab === 'split' ? splitPreview.noTokensOutput : mergePreview.noTokensInput} Shares</strong>
          </div>
          <div className="flex justify-between text-muted-foreground border-t border-border/40 pt-1.5">
            <span>Builder Fee (0.0%):</span>
            <strong className="text-foreground">0.00 USDC</strong>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Relayer Gas:</span>
            <strong className="text-yes">Gasless (Subsidy)</strong>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="rounded-xl border border-yes/40 bg-yes/10 p-2.5 flex items-center gap-2 text-xs font-bold text-yes">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleAction}
          className="w-full rounded-xl bg-primary py-3 font-display text-xs font-black uppercase text-primary-foreground shadow-lg shadow-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          {activeTab === 'split' ? 'Authorize Split Collateral' : 'Authorize Merge Tokens'}
        </button>

        {/* Compliance Footer */}
        <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-yes" />
          <span>Polymarket CTF Contract • Polygon POS Mainnet</span>
        </div>
      </div>
    </div>
  )
}
