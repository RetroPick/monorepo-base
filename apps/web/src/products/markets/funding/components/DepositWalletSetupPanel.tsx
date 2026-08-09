"use client";

import { Button } from "@/shared/components/ui/button";

import { DataStateEmpty } from "../../components/DataState";
import {
  DEPOSIT_WALLET_LINKED_DESCRIPTION,
  DEPOSIT_WALLET_LINKED_TITLE,
  DEPOSIT_WALLET_SETUP_DESCRIPTION,
  DEPOSIT_WALLET_SETUP_TITLE,
  DEPOSIT_WALLET_UNAVAILABLE_DESCRIPTION,
  DEPOSIT_WALLET_UNAVAILABLE_TITLE,
  PREVIEW_MODAL_CANCEL,
  PREVIEW_MODAL_CONFIRM,
  PREVIEW_MODAL_TITLE,
  SETUP_CTA_LABEL,
} from "../lib/fundingCopy";
import type { DepositWalletSetupState } from "../hooks/useDepositWalletSetup";
import type { AccountWalletPreviewResponse } from "../lib/fundingApiClient";

interface DepositWalletSetupPanelProps {
  hasLinkedWallet: boolean;
  state: DepositWalletSetupState;
  errorMessage: string | null;
  preview: AccountWalletPreviewResponse | null;
  createEnabled: boolean;
  canAttemptSetup: boolean;
  wrongChain: boolean;
  onStartPreview: () => void;
  onConfirmSign: () => void;
  onCancelPreview: () => void;
}

export function DepositWalletSetupPanel({
  hasLinkedWallet,
  state,
  errorMessage,
  preview,
  createEnabled,
  canAttemptSetup,
  wrongChain,
  onStartPreview,
  onConfirmSign,
  onCancelPreview,
}: DepositWalletSetupPanelProps) {
  if (hasLinkedWallet || state === "linked") {
    return (
      <section className="rounded-lg border border-border p-4" role="status">
        <h2 className="text-sm font-medium">{DEPOSIT_WALLET_LINKED_TITLE}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{DEPOSIT_WALLET_LINKED_DESCRIPTION}</p>
      </section>
    );
  }

  if (!createEnabled || state === "unavailable") {
    return (
      <DataStateEmpty
        title={DEPOSIT_WALLET_UNAVAILABLE_TITLE}
        description={DEPOSIT_WALLET_UNAVAILABLE_DESCRIPTION}
      />
    );
  }

  const busy = state === "previewing" || state === "relaying";

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">{DEPOSIT_WALLET_SETUP_TITLE}</h2>
      <p className="text-sm text-muted-foreground">{DEPOSIT_WALLET_SETUP_DESCRIPTION}</p>

      {wrongChain ? (
        <p className="text-sm text-destructive">Switch to Polygon (137) before setting up a deposit wallet.</p>
      ) : null}

      {state === "error" && errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="button"
        size="sm"
        disabled={!canAttemptSetup || busy || wrongChain}
        onClick={() => void onStartPreview()}
      >
        {busy ? "Working…" : SETUP_CTA_LABEL}
      </Button>

      {state === "awaiting_wallet" && preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deposit-wallet-preview-title"
        >
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-background p-4 shadow-lg">
            <h3 id="deposit-wallet-preview-title" className="text-lg font-semibold">
              {PREVIEW_MODAL_TITLE}
            </h3>
            <p className="text-sm text-muted-foreground">
              {preview.message ||
                "You will deploy a deposit wallet via upstream relayer; RetroPick never stores your private key."}
            </p>
            <p className="text-xs text-muted-foreground">
              Chain: Polygon ({preview.chainId}). No relayer API keys are entered in this UI.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void onConfirmSign()}>
                {PREVIEW_MODAL_CONFIRM}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onCancelPreview}>
                {PREVIEW_MODAL_CANCEL}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
