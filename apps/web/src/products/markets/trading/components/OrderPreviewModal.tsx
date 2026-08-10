"use client";

import { Button } from "@/shared/components/ui/button";

import { FeeDisclosure } from "./FeeDisclosure";
import {
  ORDER_PREVIEW_MODAL_CANCEL,
  ORDER_PREVIEW_MODAL_CONFIRM,
  ORDER_PREVIEW_MODAL_TITLE,
} from "../lib/tradingCopy";
import type { OrderPreviewResponse } from "../lib/tradingApiClient";

interface OrderPreviewModalProps {
  preview: OrderPreviewResponse;
  orderSubmitEnabled: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OrderPreviewModal({
  preview,
  orderSubmitEnabled,
  busy,
  onConfirm,
  onCancel,
}: OrderPreviewModalProps) {
  const { humanSummary } = preview;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-preview-title"
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-lg">
        <header>
          <h3 id="order-preview-title" className="text-lg font-semibold text-foreground">
            {ORDER_PREVIEW_MODAL_TITLE}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {humanSummary.action} {humanSummary.outcome} · {humanSummary.market}
          </p>
        </header>

        <FeeDisclosure preview={preview} />

        <p className="text-xs text-muted-foreground">
          Chain ID {humanSummary.chainId}. Confirm only if these details match your order ticket.
        </p>

        {!orderSubmitEnabled ? (
          <p className="text-xs text-amber-500">
            Order submission is disabled on this environment. You can still review the preview; signing
            will not submit to the venue.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void onConfirm()}>
            {busy ? "Working…" : ORDER_PREVIEW_MODAL_CONFIRM}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onCancel}>
            {ORDER_PREVIEW_MODAL_CANCEL}
          </Button>
        </div>
      </div>
    </div>
  );
}
