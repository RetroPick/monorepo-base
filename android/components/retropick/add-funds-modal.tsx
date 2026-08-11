'use client'

import { useState } from 'react'
import { X, ArrowLeft, CreditCard, Inbox, QrCode, Copy, Check, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AddFundsModal({
  open,
  onClose,
  balance,
  walletAddress,
  onAddBalance,
}: {
  open: boolean
  onClose: () => void
  balance: number
  walletAddress: string
  onAddBalance: (amount: number, description: string) => void
}) {
  const [screen, setScreen] = useState<'main' | 'card' | 'crypto'>('main')
  const [cryptoSubMode, setCryptoSubMode] = useState<'transfer' | 'receive'>('transfer')

  // Card Payment States
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [amount, setAmount] = useState('100')
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle')

  // Crypto Deposit States
  const [selectedChain, setSelectedChain] = useState('Base')
  const [selectedToken, setSelectedToken] = useState('USDC')
  const [copied, setCopied] = useState(false)
  const [depositStatus, setDepositStatus] = useState<'idle' | 'processing' | 'success'>('idle')
  const [depositedAmount, setDepositedAmount] = useState('250')

  if (!open) return null

  // Card input formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    const formatted = val.match(/.{1,4}/g)?.join(' ') || val
    setCardNumber(formatted.substring(0, 19))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    let formatted = val
    if (val.length > 2) {
      formatted = `${val.substring(0, 2)}/${val.substring(2, 4)}`
    }
    setExpiry(formatted.substring(0, 5))
  }

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    setCvv(val.substring(0, 3))
  }

  // Action handlers
  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardNumber || !expiry || !cvv || !amount) return
    
    setPaymentStatus('processing')
    setTimeout(() => {
      setPaymentStatus('success')
      const numAmount = parseFloat(amount) || 0
      onAddBalance(numAmount, `Deposit via Card (Visa Ending in ${cardNumber.slice(-4)})`)
    }, 2000)
  }

  const handleCryptoSubmit = () => {
    setDepositStatus('processing')
    setTimeout(() => {
      setDepositStatus('success')
      const numAmount = parseFloat(depositedAmount) || 0
      onAddBalance(numAmount, `Deposit of ${numAmount} ${selectedToken} on ${selectedChain}`)
    }, 2000)
  }

  const effectiveAddress = walletAddress || '0x23C5b64c76E0DE86981E297A4c93561a002EE300'

  const copyToClipboard = () => {
    navigator.clipboard.writeText(effectiveAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px] p-0 animate-fade-in">
      {/* Click outside to close (disabled in processing state) */}
      <div 
        className="absolute inset-0" 
        onClick={() => {
          if (paymentStatus !== 'processing' && depositStatus !== 'processing') {
            onClose()
          }
        }} 
      />

      {/* Full-width edge-to-edge Slide up dialog container sitting flush on top of BottomNav */}
      <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border bg-card p-5 pb-6 shadow-2xl animate-slide-up flex flex-col max-h-[calc(85vh-92px)] overflow-y-auto">
        
        {/* Grab Handle Pill */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 mb-2.5 cursor-pointer" onClick={() => {
          if (paymentStatus !== 'processing' && depositStatus !== 'processing') onClose()
        }} />
        
        {/* CLOSE BUTTON */}
        {(paymentStatus !== 'processing' && depositStatus !== 'processing') && (
          <button 
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full bg-secondary/20 p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40 active:scale-95 transition-all"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* ---------------- 1. MAIN SELECTOR SCREEN ---------------- */}
        {screen === 'main' && (
          <div className="space-y-6 pt-2">
            <div className="text-center space-y-1.5 pb-2 border-b border-border/40">
              <h3 className="text-base font-black text-foreground">Add funds to your RetroPick wallet</h3>
              <p className="text-[11px] text-muted-foreground">Select a method to load USDC into your balance</p>
            </div>

            <div className="space-y-3">
              {/* Pay with card */}
              <button
                onClick={() => setScreen('card')}
                className="w-full flex items-center gap-4 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 active:scale-[0.99] transition-all p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Pay with card</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Deposit instantly using Visa, Mastercard, or credit card</p>
                </div>
              </button>

              {/* Transfer from wallet */}
              <button
                onClick={() => {
                  setCryptoSubMode('transfer')
                  setScreen('crypto')
                }}
                className="w-full flex items-center gap-4 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 active:scale-[0.99] transition-all p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                  <Inbox className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Transfer from wallet</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Send funds directly from external Web3 e-wallet apps</p>
                </div>
              </button>

              {/* Receive funds */}
              <button
                onClick={() => {
                  setCryptoSubMode('receive')
                  setScreen('crypto')
                }}
                className="w-full flex items-center gap-4 rounded-xl border border-border bg-secondary/10 hover:bg-secondary/20 active:scale-[0.99] transition-all p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yes/10 text-yes">
                  <QrCode className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Receive funds</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Show address QR code to deposit from exchanges</p>
                </div>
              </button>
            </div>

            {/* Shield Footer */}
            <div className="flex items-center justify-center gap-1.5 pt-2 text-[10px] font-bold text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Protected by</span>
              <span className="flex items-center gap-1 text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> privy
              </span>
            </div>
          </div>
        )}

        {/* ---------------- 2. PAY WITH CARD SCREEN ---------------- */}
        {screen === 'card' && (
          <div className="space-y-4 pt-2">
            {/* Header */}
            {paymentStatus === 'idle' && (
              <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                <button 
                  onClick={() => setScreen('main')}
                  className="rounded-lg bg-secondary/10 p-1.5 text-foreground hover:bg-secondary/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-foreground">Pay with card</h3>
                  <p className="text-[10px] text-muted-foreground">Credit Card or Visa instant top-up</p>
                </div>
              </div>
            )}

            {paymentStatus === 'idle' && (
              <form onSubmit={handleCardSubmit} className="space-y-3.5">
                {/* Card Number */}
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Card Number</label>
                  <input
                    type="text"
                    required
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="mt-1.5 w-full rounded-xl border border-border bg-secondary/10 px-3.5 py-3 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                  />
                </div>

                {/* Expiry + CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Expiry Date</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={handleExpiryChange}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/10 px-3.5 py-3 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">CVV</label>
                    <input
                      type="password"
                      required
                      placeholder="•••"
                      value={cvv}
                      onChange={handleCvvChange}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/10 px-3.5 py-3 text-xs font-semibold text-foreground outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Deposit Amount (USDC)</label>
                  <div className="mt-1.5 flex items-center justify-between rounded-xl border border-border bg-secondary/10 px-3.5 py-3 text-xs font-semibold text-foreground focus-within:border-primary/50">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      required
                      min="5"
                      max="5000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent px-2 text-right font-bold text-foreground outline-none"
                    />
                    <span className="text-muted-foreground ml-1.5">USDC</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all mt-2"
                >
                  Pay ${amount}.00 USD
                </button>
              </form>
            )}

            {/* Payment Processing Loader */}
            {paymentStatus === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-black text-foreground">Processing card payment...</p>
                <p className="text-[10px] text-muted-foreground">Securing transaction via Stripe & Visa Gateway</p>
              </div>
            )}

            {/* Payment Success Screen */}
            {paymentStatus === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center animate-scale-up">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yes/15 text-yes text-3xl animate-bounce">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-foreground">Deposit Successful!</h3>
                  <p className="text-xs text-muted-foreground">
                    Bought <strong>{amount} USDC</strong> instantly using Visa/Card.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setPaymentStatus('idle')
                    setScreen('main')
                    onClose()
                  }}
                  className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all mt-4"
                >
                  Confirm & Done
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- 3. CRYPTO DEPOSIT SCREEN ---------------- */}
        {screen === 'crypto' && (
          <div className="space-y-4 pt-2">
            {/* Header */}
            {depositStatus === 'idle' && (
              <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                <button 
                  onClick={() => setScreen('main')}
                  className="rounded-lg bg-secondary/10 p-1.5 text-foreground hover:bg-secondary/20"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-foreground">
                    {cryptoSubMode === 'transfer' ? 'Select Network and Token' : 'Receive Funds'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">Deposit directly from e-wallets or exchanges</p>
                </div>
              </div>
            )}

            {depositStatus === 'idle' && (
              <div className="space-y-4">
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Choose a blockchain and cryptocurrency - it will be automatically converted to USDC on RetroPick, which is required for trading. Minimum fee: $1.
                </p>

                {/* Balance Display */}
                <div className="flex items-center justify-between rounded-xl bg-secondary/10 border border-border px-3.5 py-2.5 text-xs font-bold text-foreground">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span>{balance.toFixed(2)} USDC</span>
                </div>

                {/* Chain & Token Dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Select Chain</label>
                    <select
                      value={selectedChain}
                      onChange={(e) => setSelectedChain(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-xs font-semibold text-foreground outline-none"
                    >
                      <option value="Base">🔵 Base</option>
                      <option value="Polygon">💜 Polygon</option>
                      <option value="Arbitrum">🔷 Arbitrum</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Select Currency</label>
                    <select
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-border bg-secondary/20 px-3 py-2.5 text-xs font-semibold text-foreground outline-none"
                    >
                      <option value="USDC">USDC (USD Coin)</option>
                      <option value="ETH">ETH (Ethereum)</option>
                      <option value="USDT">USDT (Tether)</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Sub-View Layouts */}
                {cryptoSubMode === 'transfer' ? (
                  /* --- Transfer from external wallet --- */
                  <div className="space-y-3 pt-2">
                    <div className="border border-border/50 rounded-xl bg-secondary/5 p-3 space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                        <span>Simulation Deposit Amount</span>
                        <span>Min: 10 USDC</span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground">
                        <input
                          type="number"
                          value={depositedAmount}
                          onChange={(e) => setDepositedAmount(e.target.value)}
                          className="w-full bg-transparent outline-none"
                        />
                        <span className="text-muted-foreground ml-1.5">{selectedToken}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCryptoSubmit}
                      className="w-full rounded-xl bg-primary py-3.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                      Transfer from Web3 Wallet
                    </button>
                  </div>
                ) : (
                  /* --- Receive funds / QR Code view --- */
                  <div className="space-y-3.5 flex flex-col items-center pt-1">
                    {/* Simulated QR Code */}
                    <div className="h-28 w-28 border-2 border-border p-2 bg-white rounded-lg flex items-center justify-center">
                      {/* Standard QR Code SVG representation */}
                      <svg viewBox="0 0 100 100" className="w-full h-full fill-black stroke-none">
                        <rect x="0" y="0" width="20" height="20" />
                        <rect x="5" y="5" width="10" height="10" fill="white" />
                        <rect x="80" y="0" width="20" height="20" />
                        <rect x="85" y="5" width="10" height="10" fill="white" />
                        <rect x="0" y="80" width="20" height="20" />
                        <rect x="5" y="85" width="10" height="10" fill="white" />
                        {/* Barcode pixels */}
                        <rect x="30" y="10" width="10" height="40" />
                        <rect x="50" y="20" width="15" height="15" />
                        <rect x="30" y="70" width="40" height="10" />
                        <rect x="60" y="40" width="10" height="30" />
                        <rect x="45" y="50" width="10" height="15" />
                      </svg>
                    </div>

                    {/* Copy Address Row */}
                    <div className="w-full space-y-1.5 text-center">
                      <p className="text-[10px] text-muted-foreground">Send {selectedToken} to your {selectedChain} wallet:</p>
                      <button
                        onClick={copyToClipboard}
                        className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/15 px-3.5 py-2.5 text-[11px] font-bold text-foreground hover:bg-secondary/25 active:scale-[0.99] transition-all"
                      >
                        <span className="truncate">{effectiveAddress}</span>
                        {copied ? (
                          <Check className="h-4 w-4 text-yes shrink-0" />
                        ) : (
                          <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground shrink-0" />
                        )}
                      </button>
                    </div>

                    {/* Simulate Deposit Arrival */}
                    <button
                      onClick={handleCryptoSubmit}
                      className="w-full rounded-xl border border-primary/30 bg-primary/10 py-3 text-xs font-bold text-primary hover:bg-primary/20 mt-1"
                    >
                      Simulate Deposit Arrival ($250.00)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Crypto Deposit Loader */}
            {depositStatus === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-black text-foreground">Waiting for confirmations...</p>
                <p className="text-[10px] text-muted-foreground">Monitoring transactions on {selectedChain} Network...</p>
              </div>
            )}

            {/* Crypto Deposit Success */}
            {depositStatus === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center animate-scale-up">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yes/15 text-yes text-3xl animate-bounce">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-foreground">Deposit Detected!</h3>
                  <p className="text-xs text-muted-foreground">
                    Successfully received <strong>{cryptoSubMode === 'transfer' ? depositedAmount : '250.00'} USDC</strong> on {selectedChain}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDepositStatus('idle')
                    setScreen('main')
                    onClose()
                  }}
                  className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all mt-4"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
