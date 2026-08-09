"use client";

import { Button } from "@/shared/components/ui/button";

import {
  ORDER_RECONCILE_TIMEOUT,
  ORDER_RECONCILING,
} from "../lib/tradingCopy";

type UnknownOrderPanelProps = {
  orderId: string;
  timedOut?: boolean;
  busy?: boolean;
  onRefresh?: () => void;
};

export function UnknownOrderPanel({
  orderId,
  timedOut = false,
  busy = false,
  onRefresh,
}: UnknownOrderPanelProps) {
  return (
    <div
      className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
        {timedOut ? ORDER_RECONCILE_TIMEOUT : ORDER_RECONCILING}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Order id: {orderId}</p>
      {onRefresh ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          disabled={busy}
          onClick={onRefresh}
        >
          Check again
        </Button>
      ) : null}
    </div>
  );
}
