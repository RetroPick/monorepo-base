import { cn } from "@/shared/lib/utils";

const CARD_SHELL = "flex min-h-[200px] flex-col sm:h-[212px] sm:max-h-[212px]";

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        CARD_SHELL,
        "animate-pulse rounded-xl border border-border bg-card p-4",
        className,
      )}
      aria-hidden
    >
      <div className="h-4 w-3/4 rounded bg-elevated" />
      <div className="mt-2 h-4 w-1/2 rounded bg-elevated" />
      <div className="mt-auto flex items-end justify-between pt-4">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-elevated" />
          <div className="h-3 w-24 rounded bg-elevated" />
        </div>
        <div className="h-11 w-11 rounded-full bg-elevated" />
      </div>
    </div>
  );
}
