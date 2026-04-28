import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { MarketType } from "@/types/engine";
import {
  BinaryPayoutVisual,
  DemoShell,
  LadderPayoutVisual,
  MultiBucketPayoutVisual,
  UseCaseHintVisual,
} from "@/components/discover/market-type-demos/DemoPrimitives";

const loopTransition = { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const };

function clampStep(stepIndex: number, max: number) {
  return Math.max(0, Math.min(stepIndex, max));
}

export type DemoProps = { reducedMotion: boolean; stepIndex: number };

/** ─── Direction ─────────────────────────────────────────────── */
export function DirectionDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <BinaryPayoutVisual
        leftLabel="Up"
        rightLabel="Down"
        winningSide="left"
        reducedMotion={reducedMotion}
        caption="Winning side shares the pool funded by the other side"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Ideal for simple short-term directional views" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "Will the price finish higher or lower than when betting locked?"
          : s === 1
            ? "Add stake to Up or Down"
            : s === 2
              ? "Reference price at lock, final price at close"
              : "Up wins if final price is above the reference"
      }
    >
      {s === 0 ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-2xl" aria-hidden>
            ?
          </span>
          <div className="h-12 w-24 rounded border-2 border-dashed border-primary/50" />
        </div>
      ) : s === 1 ? (
        <div className="flex gap-3">
          <div className="rounded-lg bg-primary/20 px-4 py-2 text-sm font-semibold text-primary">Up</div>
          <div className="rounded-lg bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground">Down</div>
        </div>
      ) : (
        <svg viewBox="0 0 200 120" className="h-32 w-full max-w-[200px]" aria-hidden>
          <line x1="100" y1="10" x2="100" y2="110" stroke="currentColor" className="text-muted-foreground/50" strokeWidth="2" />
          <circle cx="100" cy="70" r="6" className="fill-sky-400" />
          <circle cx="100" cy={s === 3 ? 40 : 45} r="6" className="fill-amber-400" />
          {s === 3 ? (
            <path d="M 118 42 L 132 35 L 132 48 Z" className="fill-primary" />
          ) : null}
        </svg>
      )}
    </DemoShell>
  );
}

export function ThresholdDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <BinaryPayoutVisual
        leftLabel="At or above"
        rightLabel="Below"
        winningSide="left"
        reducedMotion={reducedMotion}
        caption="Winners on one side of the line share the stakes from the other"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Best for level targets: yields, prices, macro prints" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "Will the reading finish above—or below—a fixed line?"
          : s === 1
            ? "Pick which side of the line you believe"
            : s === 2
              ? "One automated reading at settlement vs the published threshold"
              : "Above or equal to the line → “at or above” wins"
      }
    >
      <svg viewBox="0 0 220 100" className="h-28 w-full max-w-[220px]" aria-hidden>
        <line x1="10" y1="50" x2="210" y2="50" stroke="#fbbf24" strokeWidth="3" strokeDasharray="8 6" opacity={0.9} />
        <circle
          cx={s >= 3 ? 170 : 110}
          cy="35"
          r="8"
          className="fill-foreground"
        />
      </svg>
    </DemoShell>
  );
}

export function RangeCloseDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <MultiBucketPayoutVisual
        reducedMotion={reducedMotion}
        winnerIndex={1}
        caption="Only players in the winning zone split the other zones’ stakes"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="When you expect a close inside a band, not a breakout call" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "Which zone will the closing price fall into?"
          : s === 1
            ? "Stake in one price bucket"
            : s === 2
              ? "Only the final price matters—not the path"
              : "The bucket that contains the close wins"
      }
    >
      <div className="flex h-24 items-end gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-16 w-10 rounded-md ${
              i === 1 && s >= 1 ? "bg-violet-500/70 ring-2 ring-primary" : "bg-muted-foreground/20"
            } ${s === 3 && i === 1 ? "ring-2 ring-primary" : ""}`}
          />
        ))}
      </div>
      {s >= 2 ? (
        <div className="absolute top-10 left-1/2 size-3 -translate-x-1/2 rounded-full bg-foreground" aria-hidden />
      ) : null}
    </DemoShell>
  );
}

export function VelocityDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <MultiBucketPayoutVisual
        reducedMotion={reducedMotion}
        winnerIndex={2}
        caption="Winning size-bucket shares stakes from every other bucket"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Big events where direction is fuzzy but size of move is not" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "How much will it move—up or down counts the same"
          : s === 1
            ? "Pick a move-size bucket"
            : s === 2
              ? "Start snapshot vs final reading"
              : "Bucket matching |% change| wins"
      }
    >
      <svg viewBox="0 0 220 90" className="h-24 w-full max-w-[220px]" aria-hidden>
        <line x1="40" y1="70" x2="40" y2="20" stroke="currentColor" className="text-muted-foreground/40" strokeWidth="2" />
        <line x1="120" y1="70" x2="120" y2="20" stroke="currentColor" className="text-muted-foreground/40" strokeWidth="2" />
        <motion.rect
          x="34"
          width="12"
          height="30"
          rx="2"
          className="fill-emerald-400"
          animate={reducedMotion ? { y: 40, height: 30 } : { y: [45, 32, 45], height: [25, 38, 25] }}
          transition={reducedMotion ? { duration: 0 } : { ...loopTransition }}
        />
        <motion.rect
          x="114"
          width="12"
          height="42"
          rx="2"
          className="fill-amber-400"
          animate={reducedMotion ? { y: 28, height: 42 } : { y: [22, 30, 22], height: [48, 40, 48] }}
          transition={reducedMotion ? { duration: 0 } : { ...loopTransition, delay: 0.2 }}
        />
      </svg>
    </DemoShell>
  );
}

export function LadderDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <LadderPayoutVisual caption="Weights set how much of the losing pool the winning tier can claim" />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="When rarer tiers should pay more if you are right" />;
  }
  const weights = [0.35, 0.85, 0.45, 0.55];
  return (
    <DemoShell
      caption={
        s === 0
          ? "Which tier hits—and tiers can pay differently"
          : s === 1
            ? "Choose the tier you think contains the close"
            : s === 2
              ? "One closing price vs tier lines"
              : "Tier containing the close wins"
      }
    >
      <div className="flex flex-col gap-2">
        {weights.map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${i === 1 ? "bg-rose-400" : "bg-muted-foreground/35"}`}
                initial={{ width: `${w * 100}%` }}
                animate={
                  reducedMotion
                    ? undefined
                    : i === 1
                      ? { width: ["55%", "92%", "55%"], opacity: [0.85, 1, 0.85] }
                      : { width: `${w * 100}%` }
                }
                transition={reducedMotion ? undefined : { ...loopTransition }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground">Tier {i + 1}</span>
          </div>
        ))}
      </div>
    </DemoShell>
  );
}

export function ConvergenceDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <BinaryPayoutVisual
        leftLabel="Converge"
        rightLabel="Diverge"
        winningSide="left"
        reducedMotion={reducedMotion}
        caption="Binary pool; void if spread barely moves (refunds)"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Pairs and relative-value trades in one contract" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "Are two prices growing closer or further apart?"
          : s === 1
            ? "Choose converge (tighter) or diverge (wider)"
            : s === 2
              ? "Spread at lock vs spread at close"
              : "Narrower gap → converge; wider → diverge"
      }
    >
      <svg viewBox="0 0 200 100" className="h-28 w-full max-w-[200px]" aria-hidden>
        <motion.line
          x1="20"
          y1="30"
          x2="180"
          y2="70"
          stroke="#67e8f9"
          strokeWidth="3"
          animate={reducedMotion ? undefined : { y1: [30, 38, 30], y2: [70, 62, 70] }}
          transition={reducedMotion ? undefined : { ...loopTransition }}
        />
        <motion.line
          x1="20"
          y1="70"
          x2="180"
          y2="30"
          stroke="#a5b4fc"
          strokeWidth="3"
          animate={reducedMotion ? undefined : { y1: [70, 64, 70], y2: [30, 36, 30] }}
          transition={reducedMotion ? undefined : { ...loopTransition }}
        />
        <rect x="70" y="38" width="60" height="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4 3" rx="4" />
      </svg>
    </DemoShell>
  );
}

export function CompositeDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <BinaryPayoutVisual
        leftLabel="Yes"
        rightLabel="No"
        winningSide="right"
        reducedMotion={reducedMotion}
        caption="Yes/No pool: winning outcome takes from the other side"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Multi-condition macro or cross-asset stories" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "Do several checks combine to true or false?"
          : s === 1
            ? "Stake on Yes (rule passes) or No"
            : s === 2
              ? "Each condition reads its feed at settlement"
              : "And / Or / Majority decides Yes vs No"
      }
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="size-10 rounded-full border-2 border-lime-400/60 bg-lime-500/30"
              animate={
                reducedMotion
                  ? undefined
                  : { scale: [1, 1.06, 1], opacity: i === 0 ? [0.5, 1, 0.5] : [1, 0.65, 1] }
              }
              transition={reducedMotion ? undefined : { ...loopTransition, delay: i * 0.12 }}
            />
          ))}
        </div>
        {s >= 3 ? (
          <div className="text-xs font-semibold text-foreground">→ Yes or No</div>
        ) : null}
      </div>
    </DemoShell>
  );
}

export function CorridorDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <BinaryPayoutVisual
        leftLabel="Inside"
        rightLabel="Outside"
        winningSide="left"
        reducedMotion={reducedMotion}
        caption="Two-outcome pool after the path is judged"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Range-bound windows—not just where it closes" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "Did price stay inside both rails the whole time?"
          : s === 1
            ? "Inside (never breach) vs Outside (touched a rail)"
            : s === 2
              ? "Full-period high and low vs the band"
            : "Any touch of top or bottom rail → Outside"
      }
    >
      <svg viewBox="0 0 220 100" className="h-28 w-full max-w-[220px]" aria-hidden>
        <rect x="20" y="25" width="180" height="50" fill="rgba(113,113,122,0.25)" stroke="rgba(255,255,255,0.2)" rx="4" />
        <line x1="20" y1="40" x2="200" y2="40" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
        <line x1="20" y1="60" x2="200" y2="60" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
        <motion.rect
          x="95"
          width="10"
          height="34"
          rx="2"
          className="fill-amber-400/90"
          animate={reducedMotion ? { y: 38 } : { y: [42, 32, 48, 38] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </DemoShell>
  );
}

export function CascadeDemo({ reducedMotion, stepIndex }: DemoProps) {
  const s = clampStep(stepIndex, 5);
  if (s === 4) {
    return (
      <MultiBucketPayoutVisual
        reducedMotion={reducedMotion}
        winnerIndex={2}
        caption="Winning break-count tier shares stakes from the other tiers"
      />
    );
  }
  if (s === 5) {
    return <UseCaseHintVisual caption="Trend strength—how many stacked levels break" />;
  }
  return (
    <DemoShell
      caption={
        s === 0
          ? "How many stacked levels get broken through?"
          : s === 1
            ? "Pick the tier matching how many breaks you expect"
            : s === 2
              ? "Track the extreme price through the window"
              : "Count levels crossed—matching tier wins"
      }
    >
      <svg viewBox="0 0 220 100" className="h-28 w-full max-w-[220px]" aria-hidden>
        <line x1="20" y1="72" x2="200" y2="72" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <line x1="20" y1="52" x2="200" y2="52" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <line x1="20" y1="32" x2="200" y2="32" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <motion.circle
          cx="120"
          r="6"
          className="fill-orange-300"
          animate={reducedMotion ? { cy: 36 } : { cy: [68, 50, 36, 50, 68] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </DemoShell>
  );
}

const DEMO_BY_TYPE: Partial<Record<MarketType, ComponentType<DemoProps>>> = {
  [MarketType.Direction]: DirectionDemo,
  [MarketType.Threshold]: ThresholdDemo,
  [MarketType.RangeClose]: RangeCloseDemo,
  [MarketType.Velocity]: VelocityDemo,
  [MarketType.Ladder]: LadderDemo,
  [MarketType.Convergence]: ConvergenceDemo,
  [MarketType.Composite]: CompositeDemo,
  [MarketType.Corridor]: CorridorDemo,
  [MarketType.Cascade]: CascadeDemo,
};

export function MarketTypeDemoAnimation(props: DemoProps & { marketType: MarketType }) {
  const Cmp = DEMO_BY_TYPE[props.marketType];
  if (!Cmp) return null;
  return <Cmp reducedMotion={props.reducedMotion} stepIndex={props.stepIndex} />;
}
