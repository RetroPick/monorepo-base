'use client'

import { useState } from 'react'
import { X, Mail, ShieldCheck, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

function GoogleLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.27v3.09C3.25 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.38l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.62l4.01 3.09c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  )
}

function XLogo({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function AppleLogo({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.13-1.96.99-3.11-1 .04-2.18.67-2.88 1.49-.63.73-1.18 1.9-1.03 3.03 1.12.09 2.25-.58 2.92-1.41z" />
    </svg>
  )
}

function TelegramLogo({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#229ED9"
        d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z"
      />
      <path
        fill="#FFF"
        d="M5.49 11.933l12.463-4.807c.578-.209 1.085.137.9.998l-2.12 9.99c-.156.703-.574.876-1.163.545l-3.238-2.388-1.562 1.504c-.173.173-.318.318-.652.318l.233-3.303 6.012-5.432c.261-.233-.057-.363-.405-.131l-7.432 4.678-3.203-1.002c-.698-.218-.711-.698.147-1.037z"
      />
    </svg>
  )
}

export function ConnectModal({
  open,
  onClose,
  onProvisionWallet,
}: {
  open: boolean
  onClose: () => void
  onProvisionWallet: (type: 'embedded' | 'external', provider?: string, email?: string) => void
}) {
  const [emailInput, setEmailInput] = useState('')
  const [step, setStep] = useState<'methods' | 'email-otp' | 'connecting'>('methods')
  const [activeProvider, setActiveProvider] = useState<string>('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')

  if (!open) return null

  const handleSocialLogin = (provider: string) => {
    setActiveProvider(provider)
    setStep('connecting')
    setTimeout(() => {
      onProvisionWallet('embedded', provider, `user_${provider.toLowerCase()}@retropick.app`)
      setStep('methods')
      onClose()
    }, 1000)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!emailInput || !emailInput.includes('@')) {
      setError('Please enter a valid email')
      return
    }
    setStep('email-otp')
  }

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) {
      setError('Enter 4-digit code (e.g. 1234)')
      return
    }
    setStep('connecting')
    setTimeout(() => {
      onProvisionWallet('embedded', 'email', emailInput)
      setStep('methods')
      onClose()
    }, 1000)
  }

  return (
    <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in p-0">
      {/* Backdrop overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Full-width edge-to-edge Slide up dialog container sitting flush on top of BottomNav */}
      <div className="relative z-10 w-full mb-[92px] rounded-t-3xl rounded-b-none border-t border-border/80 bg-card text-foreground p-5 pb-6 shadow-2xl animate-slide-up flex flex-col space-y-4 max-h-[calc(85vh-92px)] overflow-y-auto">
        
        {/* Grab Handle Pill */}
        <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-1 mb-1 cursor-pointer" onClick={onClose} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full bg-secondary/40 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/70 active:scale-95 transition-all"
          aria-label="Close dialog"
        >
          <X className="h-4.5 w-4.5 stroke-[2.2px]" />
        </button>

        {/* Header */}
        <div className="text-center pt-1 pb-2 border-b border-border/60">
          <h2 className="font-display text-base font-extrabold text-foreground">
            Log in or sign up
          </h2>
        </div>

        {/* Step 1: Methods */}
        {step === 'methods' && (
          <div className="space-y-2.5">
            {/* Google */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-3 hover:bg-secondary/60 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-card border border-border/60 shrink-0 shadow-xs overflow-hidden">
                  <img src="/google.webp" alt="Google" className="h-full w-full object-cover rounded-xl" />
                </span>
                <span className="text-xs font-bold text-foreground">Google</span>
              </div>
              <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                Recent
              </span>
            </button>

            {/* Email Field */}
            <form onSubmit={handleEmailSubmit} className="space-y-1">
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/30 px-3 py-2 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-card border border-border/60 shrink-0 shadow-xs">
                    <Mail className="h-4.5 w-4.5 text-muted-foreground stroke-[2px]" />
                  </span>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
                <button
                  type="submit"
                  className="text-xs font-bold text-primary hover:underline shrink-0"
                >
                  Submit
                </button>
              </div>
              {error && <p className="text-xs font-semibold text-no px-1">{error}</p>}
            </form>

            {/* Twitter / X */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Twitter')}
              className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-3 hover:bg-secondary/60 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-card border border-border/60 shrink-0 shadow-xs overflow-hidden">
                  <img src="/twitter.webp" alt="Twitter" className="h-full w-full object-cover rounded-xl" />
                </span>
                <span className="text-xs font-bold text-foreground">Twitter</span>
              </div>
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Apple')}
              className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-3 hover:bg-secondary/60 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-card border border-border/60 shrink-0 shadow-xs overflow-hidden">
                  <img src="/apple.webp" alt="Apple" className="h-full w-full object-cover rounded-xl" />
                </span>
                <span className="text-xs font-bold text-foreground">Apple</span>
              </div>
            </button>

            {/* Telegram */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Telegram')}
              className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-3 hover:bg-secondary/60 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-card border border-border/60 shrink-0 shadow-xs overflow-hidden">
                  <img src="/telegram.webp" alt="Telegram" className="h-full w-full object-cover rounded-xl" />
                </span>
                <span className="text-xs font-bold text-foreground">Telegram</span>
              </div>
            </button>
          </div>
        )}

        {/* Step 2: Email OTP */}
        {step === 'email-otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-extrabold text-foreground">Check your inbox</h3>
              <p className="text-[11px] text-muted-foreground">
                Enter code sent to <strong className="text-foreground">{emailInput}</strong>
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="1234"
                className="w-36 text-center tracking-[8px] bg-secondary/40 border border-border rounded-xl py-2.5 text-lg font-black text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {error && <p className="text-xs font-semibold text-no text-center">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              Verify & Sign In
            </button>

            <button
              type="button"
              onClick={() => setStep('methods')}
              className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ← Back
            </button>
          </form>
        )}

        {/* Step 3: Connecting */}
        {step === 'connecting' && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs font-bold text-foreground">
              Connecting via {activeProvider || 'Privy'}...
            </p>
          </div>
        )}

        {/* Footer: Protected by Privy */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1 pb-1">
          <span>Protected by</span>
          <span className="font-bold text-foreground">privy</span>
        </div>
      </div>
    </div>
  )
}
