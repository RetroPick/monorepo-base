import { cn } from "@/shared/lib/utils";

const CARD_SHELL = "flex min-h-[238px] flex-col";

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        CARD_SHELL,
        "animate-pulse rounded-2xl border border-border/80 bg-card p-4",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-40 rounded bg-elevated" />
          <div className="h-4 w-24 rounded bg-elevated" />
        </div>
        <div className="h-5 w-14 rounded-full bg-elevated" />
      </div>
      <div className="mt-4 h-7 w-28 rounded-full bg-elevated" />
      <div className="mt-auto flex items-end justify-between pt-5">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-elevated" />
          <div className="h-3 w-24 rounded bg-elevated" />
        </div>
        <div className="h-11 w-11 rounded-lg bg-elevated" />
      </div>
    </div>
  );
}
