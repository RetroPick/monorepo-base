import { clsx } from "clsx";

import { mapQueryError, userFacingErrorMessage } from "../lib/errors";

interface DataStateBannerProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export function DataStateBanner({ error, title, onRetry, className }: DataStateBannerProps) {
  if (!error) return null;
  const mapped = mapQueryError(error);
  return (
    <div
      className={clsx(
        "rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className,
      )}
      role="alert"
    >
      <p className="font-medium">{title ?? userFacingErrorMessage(mapped.kind)}</p>
      {mapped.requestId ? (
        <p className="mt-1 font-mono text-xs opacity-80">Request ID: {mapped.requestId}</p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium underline underline-offset-2"
          onClick={onRetry}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

interface DataStateEmptyProps {
  title: string;
  description?: string;
}

export function DataStateEmpty({ title, description }: DataStateEmptyProps) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center" role="status">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

interface ProvenanceFooterProps {
  source?: string;
  observedAt?: string;
  requestId?: string;
}

export function ProvenanceFooter({ source, observedAt, requestId }: ProvenanceFooterProps) {
  return (
    <footer className="mt-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
      {source ? <p>Source: {source}</p> : null}
      {observedAt ? <p>Observed: {new Date(observedAt).toLocaleString()}</p> : null}
      {requestId ? <p className="font-mono">Request: {requestId}</p> : null}
    </footer>
  );
}
