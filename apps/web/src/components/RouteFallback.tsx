/**
 * Lightweight Suspense placeholder shown while a lazy route chunk is loading.
 * Kept intentionally tiny so it doesn't pull anything into the initial bundle.
 */
export default function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="flex min-h-[60dvh] items-center justify-center px-4 py-12"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-3 animate-pulse rounded-full bg-muted-foreground/60"
        />
        <span
          aria-hidden="true"
          className="size-3 animate-pulse rounded-full bg-muted-foreground/40"
          style={{ animationDelay: "120ms" }}
        />
        <span
          aria-hidden="true"
          className="size-3 animate-pulse rounded-full bg-muted-foreground/25"
          style={{ animationDelay: "240ms" }}
        />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
