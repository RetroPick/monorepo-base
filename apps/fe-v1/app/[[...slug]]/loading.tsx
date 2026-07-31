/**
 * Server-rendered shell while the client-only app chunk hydrates.
 * Improves first paint / LCP vs an empty body waiting on `dynamic(..., { ssr: false })`.
 */
export default function AppShellLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading RetroPick"
      className="flex min-h-[60dvh] items-center justify-center bg-background px-4 py-12 text-foreground"
    >
      <div className="flex flex-col items-center gap-4">
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
        </div>
        <p className="font-sans text-xs font-medium tracking-wide text-muted-foreground">
          RetroPick
        </p>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
