import { cn } from "@/shared/lib/utils";

const CARD_SHELL = "min-h-[238px]";

export function EventCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        CARD_SHELL,
        "skeleton-shimmer flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card p-4",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 rounded-full bg-elevated" />
        <div className="h-3 w-14 rounded bg-elevated" />
      </div>
      <div className="mt-4 h-4 w-full rounded bg-elevated" />
      <div className="mt-2 h-4 w-3/4 rounded bg-elevated" />
      <div className="mt-auto space-y-2 pt-6">
        <div className="h-3 w-24 rounded bg-elevated" />
        <div className="h-2.5 w-full rounded-full bg-elevated" />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-9 rounded-lg bg-elevated" />
          <div className="h-9 rounded-lg bg-elevated" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-20 rounded bg-elevated" />
          <div className="h-6 w-16 rounded bg-elevated" />
        </div>
      </div>
    </div>
  );
}
