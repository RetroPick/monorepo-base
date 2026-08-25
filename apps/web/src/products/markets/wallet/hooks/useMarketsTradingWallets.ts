"use client";

import { useEffect, useState } from "react";

import { getMarketsApiOrigin } from "../config/runtimeEnv";
import { useMarketsWalletSession } from "./useMarketsWalletSession";

export type TradingWalletsState = "idle" | "loading" | "loaded" | "error";

type WalletsListResponse = {
  wallets?: Array<{
    accountWallet?: string;
    isPrimary?: boolean;
  }>;
};

export function useMarketsTradingWallets() {
  const { isSessionAuthenticated } = useMarketsWalletSession();
  const [accountWallet, setAccountWallet] = useState<string | undefined>();
  const [state, setState] = useState<TradingWalletsState>("idle");

  useEffect(() => {
    if (!isSessionAuthenticated) {
      setAccountWallet(undefined);
      setState("idle");
      return;
    }

    const apiOrigin = getMarketsApiOrigin();
    if (!apiOrigin) {
      setAccountWallet(undefined);
      setState("idle");
      return;
    }

    let cancelled = false;
    setState("loading");

    void fetch(`${apiOrigin}/api/v1/markets/me/wallets`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (cancelled) {
          return;
        }
        if (response.status === 401 || response.status === 404 || response.status === 501) {
          setAccountWallet(undefined);
          setState("idle");
          return;
        }
        if (!response.ok) {
          setState("error");
          return;
        }
        const body = (await response.json()) as WalletsListResponse;
        const primary =
          body.wallets?.find((wallet) => wallet.isPrimary)?.accountWallet ??
          body.wallets?.[0]?.accountWallet;
        setAccountWallet(primary);
        setState("loaded");
      })
      .catch(() => {
        if (!cancelled) {
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSessionAuthenticated]);

  return { accountWallet, state };
}
