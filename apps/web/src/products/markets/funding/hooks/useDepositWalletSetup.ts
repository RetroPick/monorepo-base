"use client";

import { useCallback, useState } from "react";

import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";
import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import { getMarketsApiOrigin } from "../../wallet/config/runtimeEnv";
import { POLYGON_CHAIN_ID } from "../../wallet/config/chains";

import { isAccountWalletCreateEnabled } from "../config/features";
import {
  FundingApiError,
  previewAccountWallet,
  relayAccountWallet,
  type AccountWalletPreviewResponse,
} from "../lib/fundingApiClient";

export type DepositWalletSetupState =
  | "idle"
  | "unavailable"
  | "previewing"
  | "awaiting_wallet"
  | "relaying"
  | "linked"
  | "error";

export type UseDepositWalletSetupOptions = {
  onLinked?: (accountWallet: string) => void;
  deployDepositWallet?: () => Promise<{ accountWallet: string }>;
};

export function useDepositWalletSetup(options?: UseDepositWalletSetupOptions) {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const { chainId, isConnected } = useMarketsWalletConnect();
  const createEnabled = isAccountWalletCreateEnabled();
  const [state, setState] = useState<DepositWalletSetupState>(() =>
    createEnabled ? "idle" : "unavailable",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<AccountWalletPreviewResponse | null>(null);
  const [linkedAccountWallet, setLinkedAccountWallet] = useState<string | undefined>();

  const wrongChain = chainId != null && chainId !== POLYGON_CHAIN_ID;
  const canAttemptSetup =
    isSessionAuthenticated && isConnected && !wrongChain && createEnabled && Boolean(getMarketsApiOrigin());

  const resetPreview = useCallback(() => {
    setPreview(null);
    setErrorMessage(null);
    if (createEnabled && isSessionAuthenticated) {
      setState("idle");
    } else if (!createEnabled) {
      setState("unavailable");
    }
  }, [createEnabled, isSessionAuthenticated]);

  const startPreview = useCallback(async () => {
    if (!canAttemptSetup) {
      setState("unavailable");
      return;
    }
    setErrorMessage(null);
    setState("previewing");
    try {
      const body = await previewAccountWallet({ action: "deploy_deposit_wallet" });
      setPreview(body);
      setState("awaiting_wallet");
    } catch (error) {
      setPreview(null);
      if (error instanceof FundingApiError && error.code === "unavailable") {
        setState("unavailable");
        setErrorMessage(error.message);
        return;
      }
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Preview failed");
    }
  }, [canAttemptSetup]);

  const confirmAndSign = useCallback(async () => {
    if (!preview?.message) {
      setState("error");
      setErrorMessage("Missing preview payload.");
      return;
    }
    if (!options?.deployDepositWallet) {
      setState("error");
      setErrorMessage("Deposit wallet deploy is not available in this client build.");
      return;
    }
    setState("relaying");
    setErrorMessage(null);
    try {
      const { accountWallet } = await options.deployDepositWallet();
      const relay = await relayAccountWallet({
        accountWallet,
        chainId: preview.chainId,
      });
      setLinkedAccountWallet(relay.wallet.accountWallet);
      setPreview(null);
      setState("linked");
      options.onLinked?.(relay.wallet.accountWallet);
    } catch (error) {
      if (error instanceof FundingApiError && error.code === "unavailable") {
        setState("unavailable");
        setErrorMessage(error.message);
        return;
      }
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Setup failed");
    }
  }, [options, preview]);

  return {
    state,
    errorMessage,
    preview,
    linkedAccountWallet,
    createEnabled,
    canAttemptSetup,
    wrongChain,
    startPreview,
    confirmAndSign,
    resetPreview,
  };
}
