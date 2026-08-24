"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SiweMessage } from "siwe";
import { getAddress } from "viem";
import { useAccount, useSignMessage } from "wagmi";

import { getMarketsApiOrigin } from "../config/runtimeEnv";
import { POLYGON_CHAIN_ID } from "../config/chains";
import {
  addressesMatch,
  fetchAuthNonce,
  fetchAuthSession,
  postAuthLogout,
  postSiweVerify,
} from "../lib/marketsAuthClient";
import { readMarketsE2EHarness } from "../../e2e/e2eHarness";
import { MarketsAuthError, MarketsWalletError } from "../lib/walletErrors";

export type WalletSessionState =
  | "idle"
  | "restoring"
  | "awaiting_wallet"
  | "submitting"
  | "authenticated"
  | "error";

type MarketsWalletSessionContextValue = {
  address: `0x${string}` | undefined;
  sessionState: WalletSessionState;
  sessionError: string | null;
  sessionWallet: string | null;
  expiresAt: string | null;
  isSessionAuthenticated: boolean;
  isRestoring: boolean;
  authenticate: () => Promise<void>;
  logout: () => Promise<void>;
};

const MarketsWalletSessionContext = createContext<MarketsWalletSessionContextValue | null>(null);
const MAX_TIMEOUT_MS = 2_147_483_647;

function applySessionSuccess(
  wallet: string,
  expiresAt: string,
  setSessionWallet: (wallet: string) => void,
  setExpiresAt: (expiresAt: string) => void,
  setSessionState: (state: WalletSessionState) => void,
  setSessionError: (error: string | null) => void,
) {
  setSessionWallet(wallet);
  setExpiresAt(expiresAt);
  setSessionState("authenticated");
  setSessionError(null);
}

function isFutureSessionExpiry(expiresAt: string): boolean {
  const expiresAtMillis = Date.parse(expiresAt);
  return Number.isFinite(expiresAtMillis) && expiresAtMillis > Date.now();
}

function clearExpiredSession(
  setSessionWallet: (wallet: string | null) => void,
  setExpiresAt: (expiresAt: string | null) => void,
  setSessionState: (state: WalletSessionState) => void,
  setSessionError: (error: string | null) => void,
) {
  setSessionWallet(null);
  setExpiresAt(null);
  setSessionState("idle");
  setSessionError("Your Markets session has expired. Sign in again.");
}

export function MarketsWalletSessionProvider({ children }: { children: ReactNode }) {
  const e2eHarness = readMarketsE2EHarness();
  const wagmiAccount = useAccount();
  const address = e2eHarness?.wallet?.connected
    ? (e2eHarness.wallet.address as `0x${string}`)
    : wagmiAccount.address;
  const isConnected = e2eHarness?.wallet?.connected
    ? true
    : Boolean(wagmiAccount.isConnected && wagmiAccount.address);
  const chainId = e2eHarness?.wallet?.chainId ?? wagmiAccount.chainId;
  const { signMessageAsync } = useSignMessage();
  const [sessionState, setSessionState] = useState<WalletSessionState>("idle");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionWallet, setSessionWallet] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      setSessionState("idle");
      setSessionError(null);
      setSessionWallet(null);
      setExpiresAt(null);
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (sessionState !== "authenticated" || !expiresAt) {
      return;
    }

    const expiryMillis = Date.parse(expiresAt);
    if (!Number.isFinite(expiryMillis) || expiryMillis <= Date.now()) {
      clearExpiredSession(setSessionWallet, setExpiresAt, setSessionState, setSessionError);
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    const scheduleExpiry = () => {
      const remaining = expiryMillis - Date.now();
      if (remaining <= 0) {
        clearExpiredSession(setSessionWallet, setExpiresAt, setSessionState, setSessionError);
        return;
      }
      timeout = setTimeout(scheduleExpiry, Math.min(remaining, MAX_TIMEOUT_MS));
    };
    scheduleExpiry();

    return () => clearTimeout(timeout);
  }, [expiresAt, sessionState]);

  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    const apiOrigin = getMarketsApiOrigin();
    if (!apiOrigin) {
      return;
    }

    const controller = new AbortController();
    setSessionState("restoring");
    setSessionError(null);

    const harness = readMarketsE2EHarness();
    if (
      harness?.session &&
      addressesMatch(harness.session.wallet, address) &&
      isFutureSessionExpiry(harness.session.expiresAt)
    ) {
      applySessionSuccess(
        harness.session.wallet,
        harness.session.expiresAt,
        setSessionWallet,
        setExpiresAt,
        setSessionState,
        setSessionError,
      );
      return () => {
        controller.abort();
      };
    }

    void fetchAuthSession(controller.signal)
      .then((session) => {
        if (controller.signal.aborted) {
          return;
        }
        if (!session?.wallet) {
          setSessionWallet(null);
          setExpiresAt(null);
          setSessionState("idle");
          return;
        }
        if (!addressesMatch(session.wallet, address)) {
          setSessionWallet(null);
          setExpiresAt(null);
          setSessionState("idle");
          setSessionError("Connected wallet does not match your Markets session. Sign in again.");
          return;
        }
        if (!isFutureSessionExpiry(session.expiresAt)) {
          setSessionWallet(null);
          setExpiresAt(null);
          setSessionState("idle");
          setSessionError("Your Markets session has expired. Sign in again.");
          return;
        }
        applySessionSuccess(
          session.wallet,
          session.expiresAt,
          setSessionWallet,
          setExpiresAt,
          setSessionState,
          setSessionError,
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof MarketsAuthError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Could not restore Markets session.";
        setSessionState("idle");
        setSessionError(message);
      });

    return () => {
      controller.abort();
    };
  }, [address, isConnected]);

  const authenticate = useCallback(async () => {
    if (!address || !isConnected) {
      setSessionError("Connect a wallet before signing in.");
      setSessionState("error");
      return;
    }

    if (chainId !== POLYGON_CHAIN_ID) {
      setSessionError("Switch to Polygon before signing in.");
      setSessionState("error");
      throw new MarketsWalletError("CHAIN_MISMATCH", "Switch to Polygon before signing in.");
    }

    const apiOrigin = getMarketsApiOrigin();
    if (!apiOrigin) {
      setSessionError("Markets API origin is not configured.");
      setSessionState("error");
      return;
    }

    setSessionError(null);
    setSessionState("awaiting_wallet");

    try {
      const nonceResponse = await fetchAuthNonce();
      const origin = window.location.origin;
      const message = new SiweMessage({
        domain: window.location.host,
        address: getAddress(address),
        statement: "Sign in to RetroPick Markets.",
        uri: origin,
        version: "1",
        chainId: POLYGON_CHAIN_ID,
        nonce: nonceResponse.nonce,
      });

      const prepared = message.prepareMessage();
      const signature = await signMessageAsync({ message: prepared });

      setSessionState("submitting");
      const verified = await postSiweVerify({ message: prepared, signature });
      if (!addressesMatch(verified.wallet, address) || !isFutureSessionExpiry(verified.expiresAt)) {
        throw new MarketsAuthError("AUTH_FAILED", "Markets session verification was invalid. Sign in again.");
      }
      applySessionSuccess(
        verified.wallet,
        verified.expiresAt,
        setSessionWallet,
        setExpiresAt,
        setSessionState,
        setSessionError,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet signature failed";
      if (/reject|denied|cancel/i.test(message)) {
        setSessionState("idle");
        setSessionError("Signature declined. Your wallet remains connected.");
        return;
      }
      if (error instanceof MarketsAuthError || error instanceof MarketsWalletError) {
        setSessionState("error");
        setSessionError(error.message);
        return;
      }
      setSessionState("error");
      setSessionError(message);
    }
  }, [address, chainId, isConnected, signMessageAsync]);

  const logout = useCallback(async () => {
    try {
      if (getMarketsApiOrigin()) {
        await postAuthLogout();
      }
    } catch {
      // Clear local session even when logout fails (expired cookie, etc.)
    } finally {
      setSessionState("idle");
      setSessionError(null);
      setSessionWallet(null);
      setExpiresAt(null);
    }
  }, []);

  const value = useMemo<MarketsWalletSessionContextValue>(
    () => ({
      address,
      sessionState,
      sessionError,
      sessionWallet,
      expiresAt,
      isSessionAuthenticated: sessionState === "authenticated" && expiresAt != null && isFutureSessionExpiry(expiresAt),
      isRestoring: sessionState === "restoring",
      authenticate,
      logout,
    }),
    [address, authenticate, expiresAt, logout, sessionError, sessionState, sessionWallet],
  );

  return (
    <MarketsWalletSessionContext.Provider value={value}>{children}</MarketsWalletSessionContext.Provider>
  );
}

export function useMarketsWalletSessionContext(): MarketsWalletSessionContextValue {
  const context = useContext(MarketsWalletSessionContext);
  if (!context) {
    throw new Error("useMarketsWalletSession must be used within MarketsWalletSessionProvider");
  }
  return context;
}
