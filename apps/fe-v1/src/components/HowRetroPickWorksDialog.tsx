import { ChevronDown, Lock } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BinaryPayoutVisual, DemoShell } from "@/components/discover/market-type-demos/DemoPrimitives";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  HOW_RETRO_PICK_WORKS_STEPS,
  HOW_RETRO_PICK_WORKS_TITLE,
} from "@/lib/market-data/howRetroPickWorksContent";
import { cn } from "@/lib/utils";

type HowRetroPickWorksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function HowItWorksVisual({ stepIndex, reducedMotion }: { stepIndex: number; reducedMotion: boolean }) {
  switch (stepIndex) {
    case 0:
      return (
        <DemoShell caption="One question, a known end time, and clear resolution rules">
          <div className="max-w-[260px] rounded-xl border-2 border-border/70 bg-card/80 px-4 py-5 text-center shadow-sm dark:border-white/10">
            <p className="text-xs font-semibold leading-snug text-foreground">Will this resolve Yes or No?</p>
            <p className="mt-2 text-[10px] text-muted-foreground">Example—each real market shows its exact wording.</p>
          </div>
        </DemoShell>
      );
    case 1:
      return (
        <DemoShell caption="Pick the outcome you believe will happen">
          <div className="flex w-full max-w-[280px] items-stretch justify-center gap-3">
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-muted/40 px-3 py-4 dark:border-white/12">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Side A</span>
              <span className="mt-1 text-xs font-medium text-foreground">Yes</span>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-muted/40 px-3 py-4 dark:border-white/12">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Side B</span>
              <span className="mt-1 text-xs font-medium text-foreground">No</span>
            </div>
          </div>
        </DemoShell>
      );
    case 2:
      return (
        <DemoShell caption="Your stake joins others on the same side">
          <div className="flex w-full max-w-[280px] flex-col items-center gap-3">
            <div className="w-full rounded-lg border border-border/70 bg-muted/50 px-4 py-3 text-center dark:border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Side pool</span>
              <p className="mt-1 text-sm font-medium text-foreground">Growing pot</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Everyone on this outcome shares the same pool.</p>
            </div>
          </div>
        </DemoShell>
      );
    case 3:
      return (
        <DemoShell caption="After lock, the published rules cannot change">
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-500/35 bg-amber-500/10 px-6 py-5 dark:border-amber-400/25 dark:bg-amber-500/5">
            <Lock className="size-8 text-amber-700 dark:text-amber-400" aria-hidden />
            <span className="text-sm font-semibold text-foreground">Locked</span>
            <span className="max-w-[220px] text-center text-[10px] leading-relaxed text-muted-foreground">
              Timing and resolution criteria are fixed for settlement.
            </span>
          </div>
        </DemoShell>
      );
    case 4:
      return (
        <DemoShell caption="Authorized market data is read automatically at settlement">
          <div className="flex max-w-[280px] flex-col items-center gap-2 text-center">
            <div className="rounded-lg border border-border/70 bg-muted/50 px-4 py-2 text-xs font-medium text-foreground dark:border-white/10">
              Data feed
            </div>
            <span className="text-lg text-muted-foreground" aria-hidden>
              →
            </span>
            <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-medium text-primary">
              Settlement check
            </div>
          </div>
        </DemoShell>
      );
    case 5:
      return (
        <BinaryPayoutVisual
          leftLabel="Winning side"
          rightLabel="Other side"
          winningSide="left"
          reducedMotion={reducedMotion}
          caption="Winners are paid from the combined pools per the contract rules"
        />
      );
    case 6:
      return (
        <DemoShell caption="Voids refund stakes instead of paying a winner">
          <div className="flex w-full max-w-[280px] flex-col gap-2">
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-3 text-center dark:border-white/10">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">All participants</span>
              <p className="mt-1 text-xs font-medium text-foreground">Stake returned</p>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">When rules say there is no fair winner.</p>
          </div>
        </DemoShell>
      );
    default:
      return null;
  }
}

export default function HowRetroPickWorksDialog({ open, onOpenChange }: HowRetroPickWorksDialogProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [stepIndex, setStepIndex] = useState(0);

  const steps = HOW_RETRO_PICK_WORKS_STEPS;
  const total = steps.length;
  const step = steps[Math.min(Math.max(stepIndex, 0), Math.max(total - 1, 0))] ?? steps[0];
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= total - 1;
  const progressPct = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,760px)] max-w-md gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-2xl">
        <div className="border-b border-border/60 px-6 pb-4 pt-6 dark:border-white/[0.06]">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-xl">{HOW_RETRO_PICK_WORKS_TITLE}</DialogTitle>
            <DialogDescription className="sr-only">
              {step.title}. {step.body}
            </DialogDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Step {stepIndex + 1} of {total}
                </span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-1.5" aria-hidden />
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4" aria-live="polite">
            <HowItWorksVisual stepIndex={stepIndex} reducedMotion={reducedMotion} />
          </div>
          <h3 className="text-base font-semibold leading-snug text-foreground">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          {step.devNote ? (
            <Collapsible className="mt-4 rounded-lg border border-border/60 bg-muted/30 dark:border-white/[0.08]">
              <CollapsibleTrigger
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground",
                  "hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180",
                )}
              >
                Technical details (developers)
                <ChevronDown className="size-4 shrink-0 transition-transform duration-200" aria-hidden />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground dark:border-white/[0.06]">
                {step.devNote}
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </div>

        <DialogFooter className="flex-row flex-wrap items-center justify-between gap-2 border-t border-border/60 px-6 py-4 dark:border-white/[0.06] sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="min-w-[88px]"
            disabled={isFirst}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            Back
          </Button>
          <div className="flex flex-1 justify-end gap-2 sm:flex-initial">
            {!isLast ? (
              <Button type="button" className="min-w-[88px]" onClick={() => setStepIndex((i) => Math.min(total - 1, i + 1))}>
                Next
              </Button>
            ) : (
              <Button type="button" className="min-w-[88px]" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
