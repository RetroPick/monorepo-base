'use client'

import { ShieldCheck, Activity, Database, Hash, Clock, CheckCircle2 } from 'lucide-react'
import { type DataProvenance, type MarketHealth } from '@/lib/markets-terminal-client'
import { cn } from '@/lib/utils'

export function DataStateFooter({
  provenance,
  health,
}: {
  provenance: DataProvenance
  health?: MarketHealth
}) {
  return (
    <div className="w-full rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-3 text-xs shadow-2xs">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-foreground">
          <ShieldCheck className="h-4 w-4 text-yes stroke-[2px]" />
          <span>DATA PROVENANCE & HONESTY DISCLOSURE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-yes animate-pulse" />
          <span className="font-mono text-[10px] font-bold text-yes uppercase">
            {provenance.freshnessState}
          </span>
        </div>
      </div>

      {/* Grid Specs */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Database className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">Source: <strong className="text-foreground">{provenance.source}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">ETag: <strong className="text-foreground">{provenance.etag}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">Req ID: <strong className="text-foreground">{provenance.requestId}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate">Updated: <strong className="text-foreground">Just now</strong></span>
        </div>
      </div>

      {/* Liquidity Health Stats if provided */}
      {health && (
        <div className="mt-2 rounded-lg border border-border/50 bg-secondary/30 p-2 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Liquidity Health:</span>
            <span className={cn(
              "px-2 py-0.5 rounded font-mono font-bold text-[10px]",
              health.liquidityRating === 'OPTIMAL' ? "bg-yes/20 text-yes border border-yes/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            )}>
              {health.liquidityRating}
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
            <span>Spread: <strong className="text-foreground">{health.spread}</strong></span>
            <span>Depth: <strong className="text-foreground">{health.depthScore}/100</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}
