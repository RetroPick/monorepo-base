import type { ReactNode } from "react";
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
  action?: ReactNode;
}

export function DataStateEmpty({ title, description, action }: DataStateEmptyProps) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center" role="status">
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface StaleBannerProps {
  message?: string;
}

export function StaleBanner({ message = "Catalog data may be outdated. Prices shown are not guaranteed current." }: StaleBannerProps) {
  return (
    <div
      className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
      role="status"
    >
      {message}
    </div>
  );
}
