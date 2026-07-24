import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

function formatResolutionInstant(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));
}

/** Remaining time as `Nd HH:MM:SS` (days plus hours:minutes:seconds of the remainder). */
export function formatWatchlistResolveCountdown(targetMs: number, nowMs: number): string {
  const sec = Math.max(0, Math.floor((targetMs - nowMs) / 1000));
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${days}d ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Props = {
  resolveAtMs: number | null;
  fallbackResolutionLabel: string;
  loading?: boolean;
};

export function WatchlistResolutionCell({ resolveAtMs, fallbackResolutionLabel, loading }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (resolveAtMs != null && Number.isFinite(resolveAtMs)) {
    const past = now >= resolveAtMs;
    return (
      <div className="space-y-0.5">
        <p className="whitespace-nowrap tabular-nums text-foreground">{formatResolutionInstant(resolveAtMs)}</p>
        <p
          className={
            past
              ? "font-mono text-xs text-muted-foreground"
              : "font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400"
          }
        >
          {past ? "Resolved" : formatWatchlistResolveCountdown(resolveAtMs, now)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        {loading ? <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden /> : null}
        <p className="text-muted-foreground">—</p>
      </div>
      {fallbackResolutionLabel && fallbackResolutionLabel !== "-" ? (
        <p className="font-mono text-xs text-muted-foreground">From slug: {fallbackResolutionLabel}</p>
      ) : null}
    </div>
  );
}
