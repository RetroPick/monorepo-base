"use client";

import { useEffect } from "react";
import type { MarketDetail, OrderBookSnapshot } from "@retropick/polymarket";

import { Button } from "@/shared/components/ui/button";

import { walletConnectPath } from "../../routes/paths";
import { Link } from "react-router-dom";

import { OrderPreviewModal } from "./OrderPreviewModal";
import { OrderTicketFields } from "./OrderTicketFields";
import { UnknownOrderPanel } from "./UnknownOrderPanel";
import { useOrderTicketFlow } from "../hooks/useOrderTicketFlow";
import {
  ORDER_CONNECT_WALLET,
  ORDER_TICKET_LIMIT_LABEL,
  ORDER_LINK_WALLET,
  ORDER_MARKET_CLOSED,
  ORDER_PREVIEW_CTA,
  ORDER_PREVIEWING,
  ORDER_SIGNING,
  ORDER_STALE_MARKETABLE_BLOCKED,
  ORDER_STALE_RESTING_WARNING,
  ORDER_SUBMIT_SUCCESS,
  ORDER_SUBMIT_UNAVAILABLE,
  ORDER_SUBMIT_UNAVAILABLE_DETAIL,
  ORDER_SUBMITTING,
  ORDER_TICKET_TITLE,
  ORDER_WRONG_CHAIN,
} from "../lib/tradingCopy";

interface OrderTicketPanelProps {
  market: MarketDetail;
  tokenId: string;
  outcomeName?: string;
  orderBook?: OrderBookSnapshot;
  selectedPrice?: string;
  onPriceConsumed?: () => void;
}

export function OrderTicketPanel({
  market,
  tokenId,
  outcomeName,
  orderBook,
  selectedPrice,
  onPriceConsumed,
}: OrderTicketPanelProps) {
  const flow = useOrderTicketFlow({
    marketId: market.id,
    tokenId,
    marketStatus: market.status,
    orderBook,
  });

  const {
    side,
    setSide,
    price,
    setPrice,
    size,
    setSize,
    flowState,
    errorMessage,
    preview,
    submitResult,
    reconcileTimedOut,
    bookGuard,
    canAttemptPreview,
    orderSubmitEnabled,
    wrongChain,
    isSessionAuthenticated,
    isConnected,
    accountWallet,
    walletsState,
    marketOpen,
    startPreview,
    confirmSignAndSubmit,
    refreshReconcile,
    resetPreview,
    isSignPending,
  } = flow;

  useEffect(() => {
    if (selectedPrice) {
      setPrice(selectedPrice);
      onPriceConsumed?.();
    }
  }, [selectedPrice, onPriceConsumed, setPrice]);

  const busy =
    flowState === "previewing" ||
    flowState === "submitting" ||
    flowState === "reconciling" ||
    isSignPending;

  const previewDisabled =
    !canAttemptPreview ||
    busy ||
    flowState === "awaiting_wallet";

  let blockHint: string | null = null;
  if (!isSessionAuthenticated || !isConnected) {
    blockHint = ORDER_CONNECT_WALLET;
  } else if (wrongChain) {
    blockHint = ORDER_WRONG_CHAIN;
  } else if (!marketOpen) {
    blockHint = ORDER_MARKET_CLOSED;
  } else if (walletsState === "loaded" && !accountWallet) {
    blockHint = ORDER_LINK_WALLET;
  } else if (bookGuard.blockMessage === "ORDER_STALE_MARKETABLE") {
    blockHint = ORDER_STALE_MARKETABLE_BLOCKED;
  }

  const previewLabel =
    flowState === "previewing"
      ? ORDER_PREVIEWING
      : flowState === "submitting" || isSignPending
        ? ORDER_SIGNING
        : ORDER_PREVIEW_CTA;

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08]"
      aria-label="Order ticket"
    >
      <header className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{ORDER_TICKET_TITLE}</h3>
        <p className="text-xs text-muted-foreground">
          {ORDER_TICKET_LIMIT_LABEL}
          {outcomeName ? ` · ${outcomeName}` : ""}
        </p>
      </header>

      {flowState === "success" && submitResult ? (
        <p className="mb-3 text-sm text-emerald-400" role="status">
          {ORDER_SUBMIT_SUCCESS}: {submitResult}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {blockHint ? (
        <p className="mb-3 text-sm text-amber-500" role="status">
          {blockHint}
        </p>
      ) : null}

      {bookGuard.warningMessage === "ORDER_STALE_RESTING" ? (
        <p className="mb-3 text-sm text-amber-500" role="status">
          {ORDER_STALE_RESTING_WARNING}
        </p>
      ) : null}

      {!isSessionAuthenticated || !isConnected ? (
        <p className="mb-3 text-sm text-muted-foreground">
          <Link to={walletConnectPath()} className="text-primary hover:underline">
            Connect wallet
          </Link>{" "}
          to preview orders.
        </p>
      ) : null}

      <OrderTicketFields
        side={side}
        price={price}
        size={size}
        onSideChange={setSide}
        onPriceChange={setPrice}
        onSizeChange={setSize}
        disabled={busy}
      />

      <Button
        type="button"
        className="mt-4 w-full"
        disabled={previewDisabled}
        onClick={() => void startPreview()}
      >
        {previewLabel}
      </Button>

      {!orderSubmitEnabled ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">{ORDER_SUBMIT_UNAVAILABLE}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ORDER_SUBMIT_UNAVAILABLE_DETAIL}</p>
        </div>
      ) : null}

      {flowState === "awaiting_wallet" && preview ? (
        <OrderPreviewModal
          preview={preview}
          orderSubmitEnabled={orderSubmitEnabled}
          busy={busy}
          onConfirm={() => void confirmSignAndSubmit()}
          onCancel={resetPreview}
        />
      ) : null}

      {flowState === "reconciling" && submitResult ? (
        <UnknownOrderPanel
          orderId={submitResult}
          timedOut={reconcileTimedOut}
          busy={busy}
          onRefresh={() => void refreshReconcile()}
        />
      ) : null}

      {flowState === "submitting" ? (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {ORDER_SUBMITTING}
        </p>
      ) : null}
    </section>
  );
}
