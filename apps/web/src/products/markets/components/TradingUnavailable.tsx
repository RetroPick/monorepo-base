export function TradingUnavailable() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-5">
      <h3 className="text-sm font-medium">Trade</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Order placement is unavailable in Phase 1. Connect and trading arrive in later phases.
      </p>
      <button
        type="button"
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground"
      >
        Trading unavailable
      </button>
    </div>
  );
}
