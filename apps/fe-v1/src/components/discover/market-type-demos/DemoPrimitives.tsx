import type { ReactNode } from "react";
import { motion } from "framer-motion";

const loop = { duration: 2.2, repeat: Infinity, ease: "easeInOut" as const };

export function DemoShell({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="relative flex h-[240px] w-full items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-4 dark:border-white/[0.08]">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.06),transparent_40%)] opacity-70"
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [1, 1.015, 1] }}
        transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent"
        animate={{ x: ["-18%", "18%"] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [0.88, 1.06, 0.88], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      {children}
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 text-center text-[10px] leading-snug text-muted-foreground">
        {caption}
      </p>
    </div>
  );
}

/** Two-sided market: winners take share of losers' stakes. */
export function BinaryPayoutVisual({
  leftLabel,
  rightLabel,
  winningSide,
  reducedMotion,
  caption,
}: {
  leftLabel: string;
  rightLabel: string;
  winningSide: "left" | "right" | null;
  reducedMotion: boolean;
  caption: string;
}) {
  const leftWin = winningSide === "left";
  const rightWin = winningSide === "right";
  return (
    <DemoShell caption={caption}>
      <div className="flex w-full max-w-[280px] items-center justify-center gap-4">
        <motion.div
          className={`flex min-h-[100px] flex-1 flex-col items-center justify-center rounded-lg border-2 px-3 py-3 ${
            leftWin ? "border-primary bg-primary/15" : "border-border/60 bg-muted/40"
          }`}
          animate={
            reducedMotion
              ? {}
              : leftWin
                ? { scale: [1, 1.03, 1], y: [0, -2, 0] }
                : { opacity: [0.95, 0.82, 0.95] }
          }
          transition={reducedMotion ? {} : { ...loop }}
        >
          <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {leftLabel}
          </span>
          <span className="mt-1 text-xs font-medium text-foreground">Pool</span>
          {leftWin ? (
            <span className="mt-1 text-[10px] text-primary">Receives losing stakes</span>
          ) : (
            <span className="mt-1 text-[10px] text-muted-foreground">Pays winners</span>
          )}
        </motion.div>
        <motion.div
          className="text-lg text-muted-foreground"
          animate={reducedMotion ? {} : { opacity: [0.4, 1, 0.4] }}
          transition={reducedMotion ? {} : { duration: 1.8, repeat: Infinity }}
          aria-hidden
        >
          →
        </motion.div>
        <motion.div
          className={`flex min-h-[100px] flex-1 flex-col items-center justify-center rounded-lg border-2 px-3 py-3 ${
            rightWin ? "border-primary bg-primary/15" : "border-border/60 bg-muted/40"
          }`}
          animate={
            reducedMotion
              ? {}
              : rightWin
                ? { scale: [1, 1.03, 1], y: [0, -2, 0] }
                : { opacity: [0.95, 0.82, 0.95] }
          }
          transition={reducedMotion ? {} : { ...loop }}
        >
          <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {rightLabel}
          </span>
          <span className="mt-1 text-xs font-medium text-foreground">Pool</span>
          {rightWin ? (
            <span className="mt-1 text-[10px] text-primary">Receives losing stakes</span>
          ) : (
            <span className="mt-1 text-[10px] text-muted-foreground">Pays winners</span>
          )}
        </motion.div>
      </div>
    </DemoShell>
  );
}

export function MultiBucketPayoutVisual({
  reducedMotion,
  winnerIndex,
  caption,
}: {
  reducedMotion: boolean;
  winnerIndex: number;
  caption: string;
}) {
  return (
    <DemoShell caption={caption}>
      <div className="flex h-24 items-end justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className={`flex h-20 w-11 flex-col justify-end rounded-md border-2 ${
              i === winnerIndex ? "border-primary bg-primary/20" : "border-border/50 bg-muted/30"
            }`}
            animate={reducedMotion ? {} : i === winnerIndex ? { scaleY: [0.95, 1, 0.95], y: [0, -2, 0] } : { opacity: [0.8, 0.95, 0.8] }}
            style={{ transformOrigin: "bottom" }}
            transition={reducedMotion ? {} : { ...loop }}
          >
            <div className="p-1 text-center text-[9px] font-medium text-muted-foreground">Zone {i + 1}</div>
          </motion.div>
        ))}
      </div>
      <p className="absolute top-3 left-0 right-0 text-center text-[10px] font-medium text-primary">
        Only the winning zone collects from the others
      </p>
    </DemoShell>
  );
}

export function LadderPayoutVisual({ caption }: { caption: string }) {
  return (
    <DemoShell caption={caption}>
      <div className="flex flex-col gap-2 px-2">
        {[
          { label: "Tier A", weight: "Higher weight", active: false },
          { label: "Tier B (wins)", weight: "Medium weight", active: true },
          { label: "Tier C", weight: "Lower weight", active: false },
        ].map((row) => (
          <div
            key={row.label}
            className={`flex items-center justify-between rounded-md border px-2 py-2 text-left text-[11px] ${
              row.active ? "border-primary bg-primary/10" : "border-border/50 bg-muted/20"
            }`}
          >
            <span className="font-medium text-foreground">{row.label}</span>
            <motion.span
              className="text-muted-foreground"
              animate={row.active ? { opacity: [0.65, 1, 0.65] } : { opacity: [0.75, 0.9, 0.75] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {row.weight}
            </motion.span>
          </div>
        ))}
      </div>
    </DemoShell>
  );
}

export function UseCaseHintVisual({ caption }: { caption: string }) {
  return (
    <DemoShell caption={caption}>
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        <motion.div
          className="text-4xl opacity-80"
          aria-hidden
          animate={{ scale: [0.96, 1.04, 0.96], rotate: [-2, 2, -2] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        >
          ✓
        </motion.div>
        <p className="max-w-xs text-xs text-muted-foreground">A good fit when this matches how you think about the market.</p>
      </div>
    </DemoShell>
  );
}
