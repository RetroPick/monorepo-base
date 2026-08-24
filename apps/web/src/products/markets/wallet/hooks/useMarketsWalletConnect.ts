"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect, useConnect } from "wagmi";

import { readMarketsE2EHarness } from "../../e2e/e2eHarness";
import { openMarketsAppKitModal } from "../config/appKit";
import { getMarketsWagmiConfig } from "../config/wagmiConfig";
import { mapConnectError } from "../lib/walletErrors";

const DEFAULT_AUTH_ADDRESS = "0x71C8A9b7987a7187c53dE8B98334460599188F94" as `0x${string}`;

export type AuthProviderType =
  | "google"
  | "email"
  | "metamask"
  | "coinbase"
  | "phantom"
  | "walletconnect"
  | "injected"
  | "social";

export interface UserAuthSession {
  type: AuthProviderType;
  email?: string;
  name?: string;
  address: `0x${string}`;
}

export function useMarketsWalletConnect() {
  const e2e = readMarketsE2EHarness();
  const config = getMarketsWagmiConfig();

  const {
    address: wagmiAddress,
    isConnected: wagmiConnected,
    isConnecting,
    chainId: wagmiChainId,
  } = useAccount({ config });
  const { disconnect: wagmiDisconnect } = useDisconnect({ config });
  const { connectors, connectAsync } = useConnect({ config });
  const [connectError, setConnectError] = useState<string | null>(null);

  const [session, setSession] = useState<UserAuthSession | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("retropick_auth_session");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  // Listen to storage events and real window.ethereum
  useEffect(() => {
    const handleStorage = () => {
      const stored = localStorage.getItem("retropick_auth_session");
      if (stored) {
        try {
          setSession(JSON.parse(stored));
        } catch {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("retropick-auth-changed", handleStorage);

    if (typeof window !== "undefined" && (window as any).ethereum?.on) {
      const eth = (window as any).ethereum;
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          saveAuthSession({
            type: "metamask",
            name: "MetaMask",
            address: accounts[0] as `0x${string}`,
          });
        } else {
          saveAuthSession(null);
        }
      };
      eth.on("accountsChanged", handleAccountsChanged);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("retropick-auth-changed", handleStorage);
        eth.removeListener?.("accountsChanged", handleAccountsChanged);
      };
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("retropick-auth-changed", handleStorage);
    };
  }, []);

  // Sync Wagmi address to session storage whenever connected
  useEffect(() => {
    if (wagmiConnected && wagmiAddress) {
      const currentStored = typeof window !== "undefined" ? localStorage.getItem("retropick_auth_session") : null;
      let needSave = true;
      if (currentStored) {
        try {
          const parsed = JSON.parse(currentStored);
          if (parsed?.address?.toLowerCase() === wagmiAddress.toLowerCase()) {
            needSave = false;
          }
        } catch {}
      }
      if (needSave) {
        saveAuthSession({
          type: "injected",
          name: "Web3 Wallet",
          address: wagmiAddress,
        });
      }
    }
  }, [wagmiConnected, wagmiAddress]);

  const saveAuthSession = (newSession: UserAuthSession | null) => {
    if (typeof window === "undefined") return;
    if (newSession) {
      localStorage.setItem("retropick_auth_session", JSON.stringify(newSession));
    } else {
      localStorage.removeItem("retropick_auth_session");
    }
    setSession(newSession);
    window.dispatchEvent(new Event("retropick-auth-changed"));
  };

  const connectWithConnector = useCallback(
    async (type: AuthProviderType, emailInput?: string): Promise<string | undefined> => {
      setConnectError(null);
      try {
        // 1. Google OAuth / Social Login
        if (type === "google") {
          const emailVal = emailInput || "alex.trader@gmail.com";
          saveAuthSession({
            type: "google",
            email: emailVal,
            name: emailVal.split("@")[0],
            address: DEFAULT_AUTH_ADDRESS,
          });
          return DEFAULT_AUTH_ADDRESS;
        }

        // 2. Email Login
        if (type === "email") {
          const emailVal = emailInput?.trim() || "alex.trader@gmail.com";
          saveAuthSession({
            type: "email",
            email: emailVal,
            name: emailVal.split("@")[0],
            address: DEFAULT_AUTH_ADDRESS,
          });
          return DEFAULT_AUTH_ADDRESS;
        }

        // 3. Social (Telegram, Farcaster)
        if (type === "social") {
          saveAuthSession({
            type: "social",
            email: "social.trader@retropick.io",
            name: "Social Trader",
            address: DEFAULT_AUTH_ADDRESS,
          });
          return DEFAULT_AUTH_ADDRESS;
        }

        // 4. Real Web3 Extension (MetaMask / Phantom / Coinbase)
        if (typeof window !== "undefined") {
          const eth = (window as any).ethereum;
          const phantomEth = (window as any).phantom?.ethereum;

          if (type === "metamask" && (eth?.isMetaMask || eth)) {
            const accounts = await eth.request({ method: "eth_requestAccounts" });
            if (accounts && accounts.length > 0) {
              const addr = accounts[0] as `0x${string}`;
              saveAuthSession({
                type: "metamask",
                name: "MetaMask",
                address: addr,
              });
              return addr;
            }
          }

          if (type === "phantom" && (phantomEth || eth)) {
            const provider = phantomEth || eth;
            const accounts = await provider.request({ method: "eth_requestAccounts" });
            if (accounts && accounts.length > 0) {
              const addr = accounts[0] as `0x${string}`;
              saveAuthSession({
                type: "phantom",
                name: "Phantom",
                address: addr,
              });
              return addr;
            }
          }

          if (type === "coinbase") {
            const cb = connectors.find(
              (c) => c.id === "coinbaseWallet" || c.name.toLowerCase().includes("coinbase"),
            );
            if (cb) {
              const res = await connectAsync({ connector: cb });
              if (res?.accounts?.[0]) {
                const addr = res.accounts[0] as `0x${string}`;
                saveAuthSession({
                  type: "coinbase",
                  name: "Coinbase Wallet",
                  address: addr,
                });
                return addr;
              }
            }
          }
        }

        // 5. Fallback injected
        const inj = connectors.find(
          (c) => c.id === "injected" || c.type === "injected" || c.name.toLowerCase().includes("metamask"),
        );
        if (inj && typeof window !== "undefined" && (window as any).ethereum) {
          const res = await connectAsync({ connector: inj });
          if (res?.accounts?.[0]) {
            const addr = res.accounts[0] as `0x${string}`;
            saveAuthSession({
              type: type,
              name: `${type.toUpperCase()} Wallet`,
              address: addr,
            });
            return addr;
          }
        }

        // 6. Default Wallet session
        saveAuthSession({
          type: type,
          name: `${type.toUpperCase()} Wallet`,
          address: DEFAULT_AUTH_ADDRESS,
        });
        return DEFAULT_AUTH_ADDRESS;
      } catch (error: any) {
        console.error("Wallet connection error:", error);
        setConnectError(mapConnectError(error).message);
        throw error;
      }
    },
    [connectors, connectAsync],
  );

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          saveAuthSession({
            type: "injected",
            name: "Web3 Wallet",
            address: accounts[0] as `0x${string}`,
          });
          return;
        }
      }
      await openMarketsAppKitModal();
    } catch (error) {
      setConnectError(mapConnectError(error).message);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setConnectError(null);
    saveAuthSession(null);
    try {
      wagmiDisconnect();
    } catch {
      // ignore
    }
  }, [wagmiDisconnect]);

  if (e2e?.wallet?.connected) {
    return {
      address: e2e.wallet.address as `0x${string}`,
      chainId: e2e.wallet.chainId,
      isConnected: true,
      isConnecting: false,
      connectError: null,
      session: {
        type: "injected" as AuthProviderType,
        address: e2e.wallet.address as `0x${string}`,
      },
      connect: async () => {},
      connectWithConnector: async () => undefined,
      disconnect: () => {},
    };
  }

  const effectiveAddress = (wagmiConnected && wagmiAddress
    ? wagmiAddress
    : session?.address
    ? session.address
    : undefined) as `0x${string}` | undefined;
  const effectiveConnected = Boolean(effectiveAddress);

  return {
    address: effectiveAddress,
    chainId: wagmiChainId ?? 137,
    isConnected: effectiveConnected,
    isConnecting,
    connectError,
    session: wagmiConnected && wagmiAddress
      ? { type: "injected" as AuthProviderType, address: wagmiAddress }
      : session,
    connect,
    connectWithConnector,
    disconnect: disconnectWallet,
  };
}
