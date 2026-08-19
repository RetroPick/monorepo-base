import type { MarketDetail } from "@retropick/polymarket";

import { cn } from "@/shared/lib/utils";

import { formatProbability } from "../lib/decimal";

type Outcome = MarketDetail["outcomes"][number];

interface OutcomeTabsProps {
  outcomes: Outcome[];
  selectedTokenId: string;
  onSelect: (tokenId: string) => void;
}

function toneForName(name?: string): { active: string; idle: string; badge: string } {
  const n = name?.toUpperCase();
  if (n === "YES")
    return {
      active: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_14px_hsl(var(--yes)/0.25)]",
      idle: "border-white/10 bg-white/[0.03] text-slate-300 hover:border-emerald-400/30 hover:bg-emerald-500/10",
      badge: "bg-emerald-500/20 text-emerald-300",
    };
  if (n === "NO")
    return {
      active: "border-rose-400/50 bg-rose-500/15 text-rose-200 shadow-[0_0_14px_hsl(var(--no)/0.25)]",
      idle: "border-white/10 bg-white/[0.03] text-slate-300 hover:border-rose-400/30 hover:bg-rose-500/10",
      badge: "bg-rose-500/20 text-rose-300",
    };
  return {
    active: "border-primary/50 bg-primary/15 text-white shadow-[0_0_14px_hsl(var(--primary)/0.25)]",
    idle: "border-white/10 bg-white/[0.03] text-slate-300 hover:border-primary/30 hover:bg-primary/10",
    badge: "bg-primary/20 text-primary",
  };
}

export function OutcomeTabs({ outcomes, selectedTokenId, onSelect }: OutcomeTabsProps) {
  if (outcomes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Outcomes">
      {outcomes.map((outcome) => {
        const selected = selectedTokenId === outcome.upstreamId;
        const tone = toneForName(outcome.name);
        return (
          <button
            key={outcome.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-150",
              selected ? tone.active : tone.idle,
            )}
            onClick={() => onSelect(outcome.upstreamId)}
          >
            <span>{outcome.name}</span>
            {outcome.price ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums",
                  tone.badge,
                )}
              >
                {formatProbability(outcome.price)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
