'use client'

import { Logo } from '../logo'

export function SplashScreen() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-background">
      {/* Animated blue wave background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-10 left-1/2 h-72 w-[130%] animate-wave rounded-[45%] bg-blue-deep/20 blur-2xl" />
        <div
          className="absolute bottom-0 left-1/2 h-64 w-[140%] animate-wave rounded-[45%] bg-primary/15 blur-2xl"
          style={{ animationDelay: '1.2s' }}
        />
      </div>

      {/* Logo + wordmark */}
      <div className="animate-pop-in relative flex flex-col items-center">
        <div className="animate-pulse-glow shadow-[0_20px_60px_-15px] shadow-primary/50">
          <img
            src="/retropick-splash-logo.png"
            alt="RetroPick"
            className="h-24 w-24"
          />
        </div>
        <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground">
          RetroPick
        </h1>
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span>Trade</span>
          <span className="h-1 w-1 rounded-full bg-primary" />
          <span>Forecast</span>
          <span className="h-1 w-1 rounded-full bg-primary" />
          <span>Hedge</span>
        </p>
      </div>

      {/* Animated loading line */}
      <div className="absolute bottom-16 h-1 w-36 overflow-hidden rounded-full bg-muted">
        <div className="animate-loader h-full w-1/3 rounded-full bg-primary" />
      </div>
    </div>
  )
}
