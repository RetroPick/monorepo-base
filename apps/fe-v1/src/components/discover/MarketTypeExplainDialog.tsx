import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { MarketTypeDemoAnimation } from "@/components/discover/market-type-demos/MarketTypeDemoAnimation";
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
import { cn } from "@/lib/utils";
import type { DiscoverMarketTypeEntry } from "@/lib/market-data/marketTypeDiscoverContent";

type MarketTypeExplainDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: DiscoverMarketTypeEntry | null;
};

export default function MarketTypeExplainDialog({ open, onOpenChange, entry }: MarketTypeExplainDialogProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [stepIndex, setStepIndex] = useState(0);

  const steps = entry?.steps ?? [];
  const total = steps.length;
  const step = total > 0 ? steps[stepIndex] : null;
  const isFirst = stepIndex <= 0;
  const isLast = stepIndex >= total - 1;
  const progressPct = total > 0 ? Math.round(((stepIndex + 1) / total) * 100) : 0;

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open, entry?.marketType]);

  if (!entry || !step) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,760px)] max-w-md gap-0 overflow-y-auto border-border bg-background p-0 sm:max-w-2xl">
        <div className="border-b border-border/60 px-6 pb-4 pt-6 dark:border-white/[0.06]">
          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="text-xl">{entry.title}</DialogTitle>
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
            <MarketTypeDemoAnimation
              marketType={entry.marketType}
              reducedMotion={reducedMotion}
              stepIndex={stepIndex}
            />
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
