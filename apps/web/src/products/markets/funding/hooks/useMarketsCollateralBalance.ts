"use client";

import { useCallback, useEffect, useState } from "react";

import { useMarketsWalletSession } from "../../wallet/hooks/useMarketsWalletSession";
import { getMarketsApiOrigin } from "../../wallet/config/runtimeEnv";

import { FundingApiError, getBalances, type BalancesListResponse } from "../lib/fundingApiClient";

export type CollateralBalanceState =
  | "idle"
  | "loading"
  | "ready"
  | "not_linked"
  | "upstream_error"
  | "unauthorized"
  | "error";

export function useMarketsCollateralBalance(accountWallet: string | undefined) {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const [state, setState] = useState<CollateralBalanceState>("idle");
  const [data, setData] = useState<BalancesListResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    if (!isSessionAuthenticated || !accountWallet) {
      setData(null);
      setErrorMessage(null);
      setState("idle");
      return;
    }

    const apiOrigin = getMarketsApiOrigin();
    if (!apiOrigin) {
      setData(null);
      setErrorMessage(null);
      setState("idle");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setState("loading");
    setErrorMessage(null);

    void getBalances(controller.signal)
      .then((body) => {
        if (cancelled) return;
        setData(body);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setData(null);
        if (error instanceof FundingApiError) {
          setErrorMessage(error.message);
          switch (error.code) {
            case "account_not_linked":
              setState("not_linked");
              return;
            case "upstream_unavailable":
              setState("upstream_error");
              return;
            case "unauthorized":
              setState("unauthorized");
              return;
            default:
              setState("error");
              return;
          }
        }
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
        setState("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accountWallet, isSessionAuthenticated, reloadToken]);

  return { state, data, errorMessage, refetch };
}
