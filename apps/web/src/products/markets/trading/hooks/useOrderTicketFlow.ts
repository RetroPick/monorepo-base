"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSignTypedData } from "wagmi";

import { getMarketsClient } from "../../api/marketsClient";
import { POLYGON_CHAIN_ID } from "../../wallet/config/chains";
import { getMarketsApiOrigin } from "../../wallet/config/runtimeEnv";
import { useMarketsTradingWallets } from "../../wallet/hooks/useMarketsTradingWallets";
import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";

import { evaluateBookTradingGuard } from "../lib/bookTradingGuard";
import { buildOrderTypedData } from "../lib/buildOrderTypedData";
import { computeContentHash, contentHashMatches } from "../lib/computeContentHash";
import { readMarketsE2EHarness } from "../../e2e/e2eHarness";
import { validateTicketFields } from "../lib/orderTicketValidation";
import {
  previewOrder,
  submitOrder,
  TradingApiError,
  type OrderPreviewResponse,
  type OrderSide,
} from "../lib/tradingApiClient";
import {
  isOrderSuccessStatus,
  needsReconcilePolling,
  pollOrderUntilTerminal,
} from "../lib/pollOrderStatus";
import { ORDER_ELIGIBILITY_UNAVAILABLE, ORDER_REJECTED } from "../lib/tradingCopy";
import { useMarketsOrderSubmitCapability } from "./useMarketsOrderSubmitCapability";

export type OrderTicketFlowState =
  | "idle"
  | "previewing"
  | "awaiting_wallet"
  | "submitting"
  | "reconciling"
  | "success"
  | "error";

export type UseOrderTicketFlowInput = {
  marketId: string;
  tokenId: string;
  marketStatus?: string;
  orderBook?: import("@retropick/polymarket").OrderBookSnapshot;
};

export function useOrderTicketFlow(input: UseOrderTicketFlowInput) {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const { isConnected, chainId } = useMarketsWalletConnect();
  const { accountWallet, state: walletsState } = useMarketsTradingWallets();
  const { orderSubmitEnabled } = useMarketsOrderSubmitCapability();
  const { signTypedDataAsync: wagmiSignTypedDataAsync, isPending: isSignPending } = useSignTypedData();

  const signTypedDataAsync = useCallback(
    async (typedData: Parameters<typeof wagmiSignTypedDataAsync>[0]) => {
      const harness = readMarketsE2EHarness();
      if (harness?.signSignature) {
        return harness.signSignature;
      }
      return wagmiSignTypedDataAsync(typedData);
    },
    [wagmiSignTypedDataAsync],
  );

  const eligibilityQuery = useQuery({
    queryKey: ["markets", "eligibility", "order-ticket"],
    queryFn: ({ signal }) => getMarketsClient().getEligibility({ signal }).then((r) => r.data),
    enabled: isSessionAuthenticated && Boolean(getMarketsApiOrigin()),
    staleTime: 0,
  });

  const [side, setSide] = useState<OrderSide>("BUY");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [flowState, setFlowState] = useState<OrderTicketFlowState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<OrderPreviewResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [reconcileTimedOut, setReconcileTimedOut] = useState(false);

  const wrongChain = chainId != null && chainId !== POLYGON_CHAIN_ID;
  const marketOpen = input.marketStatus === "open";

  const bookGuard = useMemo(
    () =>
      evaluateBookTradingGuard({
        side,
        price,
        orderBook: input.orderBook,
        marketStatus: input.marketStatus,
      }),
    [side, price, input.orderBook, input.marketStatus],
  );

  const canAttemptPreview =
    isSessionAuthenticated &&
    isConnected &&
    !wrongChain &&
    marketOpen &&
    Boolean(accountWallet) &&
    walletsState === "loaded" &&
    Boolean(getMarketsApiOrigin()) &&
    !bookGuard.blockPreview;

  const resetPreview = useCallback(() => {
    setPreview(null);
    setFlowState("idle");
    setErrorMessage(null);
    setReconcileTimedOut(false);
    setSubmitResult(null);
  }, []);

  const startPreview = useCallback(async () => {
    const validation = validateTicketFields(side, price, size);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      setFlowState("error");
      return;
    }
    if (!accountWallet) {
      setErrorMessage("Link a trading wallet before placing orders.");
      setFlowState("error");
      return;
    }
    if (!canAttemptPreview) {
      setFlowState("error");
      return;
    }

    setErrorMessage(null);
    setSubmitResult(null);
    setFlowState("previewing");

    try {
      const elig = await eligibilityQuery.refetch();
      if (elig.error || !elig.data) {
        setErrorMessage(ORDER_ELIGIBILITY_UNAVAILABLE);
        setFlowState("error");
        return;
      }
      if (!elig.data?.eligible) {
        setErrorMessage(elig.data?.reason ?? "Trading is not available for your session.");
        setFlowState("error");
        return;
      }

      const response = await previewOrder({
        marketId: input.marketId,
        tokenId: input.tokenId,
        side,
        price: price.trim(),
        size: size.trim(),
        orderType: "LIMIT",
        timeInForce: "GTC",
        makerAddress: accountWallet,
      });

      setPreview(response);
      setFlowState("awaiting_wallet");
    } catch (error) {
      setPreview(null);
      setFlowState("error");
      if (error instanceof TradingApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Preview failed.");
    }
  }, [
    accountWallet,
    canAttemptPreview,
    eligibilityQuery,
    input.marketId,
    input.tokenId,
    price,
    side,
    size,
  ]);

  const confirmSignAndSubmit = useCallback(async () => {
    if (!preview || !accountWallet) return;

    // The capability is a hard client-side safety gate as well as a UI state.
    // Do not request a wallet signature when the resulting order cannot be submitted.
    if (!orderSubmitEnabled) {
      setPreview(null);
      setFlowState("idle");
      return;
    }

    setErrorMessage(null);
    setFlowState("submitting");

    try {
      const metadata = {
        chainId: preview.humanSummary.chainId,
        marketId: input.marketId,
        tokenId: input.tokenId,
      };
      const recomputed = await computeContentHash(preview.unsignedPayload, metadata);
      if (!contentHashMatches(preview.contentHash, recomputed)) {
        setErrorMessage("Preview hash mismatch. Request a new preview before signing.");
        setFlowState("error");
        return;
      }

      const typedData = buildOrderTypedData(preview);
      const signature = await signTypedDataAsync(typedData);

      const result = await submitOrder({
        previewId: preview.previewId,
        contentHash: preview.contentHash,
        signature,
      });

      setSubmitResult(result.orderId);

      if (needsReconcilePolling(result.status, result.warnings)) {
        setReconcileTimedOut(false);
        setFlowState("reconciling");
        const poll = await pollOrderUntilTerminal(result.orderId);
        if (poll.kind === "resolved") {
          if (isOrderSuccessStatus(poll.order.status)) {
            setPreview(null);
            setFlowState("success");
            return;
          }
          if (poll.order.status === "rejected" || poll.order.status === "canceled") {
            setErrorMessage(ORDER_REJECTED);
            setFlowState("error");
            return;
          }
        }
        setReconcileTimedOut(true);
        setFlowState("reconciling");
        return;
      }

      setPreview(null);
      setFlowState("success");
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("reject")) {
        setFlowState("awaiting_wallet");
        setErrorMessage("Signature rejected. Your order ticket is unchanged.");
        return;
      }
      setFlowState("error");
      if (error instanceof TradingApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Signing or submit failed.");
    }
  }, [
    accountWallet,
    input.marketId,
    input.tokenId,
    orderSubmitEnabled,
    preview,
    signTypedDataAsync,
  ]);

  const refreshReconcile = useCallback(async () => {
    if (!submitResult) return;
    setErrorMessage(null);
    setReconcileTimedOut(false);
    setFlowState("reconciling");
    const poll = await pollOrderUntilTerminal(submitResult, { timeoutMs: 30_000 });
    if (poll.kind === "resolved" && isOrderSuccessStatus(poll.order.status)) {
      setFlowState("success");
      return;
    }
    if (poll.kind === "resolved" && (poll.order.status === "rejected" || poll.order.status === "canceled")) {
      setErrorMessage(ORDER_REJECTED);
      setFlowState("error");
      return;
    }
    setReconcileTimedOut(true);
    setFlowState("reconciling");
  }, [submitResult]);

  useEffect(() => {
    if (flowState === "awaiting_wallet" && isSignPending) {
      setFlowState("submitting");
    }
  }, [flowState, isSignPending]);

  return {
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
    eligibilityQuery,
    startPreview,
    confirmSignAndSubmit,
    refreshReconcile,
    resetPreview,
    isSignPending,
  };
}
