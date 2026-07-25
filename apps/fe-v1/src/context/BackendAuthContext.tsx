import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";

import {
  createAuthNonce,
  fetchAuthSession,
  logoutAuthSession,
  verifyAuthSession,
} from "@/lib/api/retropickApi";

type BackendAuthState = {
  isReady: boolean;
  isAuthenticating: boolean;
  isAuthenticated: boolean;
  wallet?: `0x${string}`;
  error?: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const BackendAuthContext = createContext<BackendAuthState | null>(null);

export function BackendAuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [wallet, setWallet] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | undefined>();
  const attemptedWalletRef = useRef<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchAuthSession();
        if (!cancelled && session.authenticated) {
          setWallet(session.wallet);
        }
      } catch {
        if (!cancelled) setWallet(undefined);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async () => {
    if (!address) return;
    setIsAuthenticating(true);
    setError(undefined);
    try {
      const nonce = await createAuthNonce(address);
      const signature = await signMessageAsync({ account: address, message: nonce.message });
      const session = await verifyAuthSession({
        wallet: address,
        message: nonce.message,
        signature,
        challenge: nonce.challenge,
      });
      setWallet(session.wallet);
      attemptedWalletRef.current = address.toLowerCase();
    } catch (err) {
      setWallet(undefined);
      setError(err instanceof Error ? err.message : "Sign-in failed");
      throw err;
    } finally {
      setIsAuthenticating(false);
      setIsReady(true);
    }
  };

  const signOut = async () => {
    try {
      await logoutAuthSession();
    } catch {
      /* ignore */
    }
    setWallet(undefined);
    attemptedWalletRef.current = undefined;
    disconnect();
  };

  useEffect(() => {
    if (!isReady) return;
    if (!isConnected || !address) {
      attemptedWalletRef.current = undefined;
      setWallet(undefined);
      setError(undefined);
      return;
    }
    const normalized = address.toLowerCase();
    if (wallet?.toLowerCase() === normalized || isAuthenticating || attemptedWalletRef.current === normalized) {
      return;
    }
    attemptedWalletRef.current = normalized;
    void signIn().catch(() => undefined);
  }, [address, isAuthenticating, isConnected, isReady, wallet]);

  const value = useMemo<BackendAuthState>(
    () => ({
      isReady,
      isAuthenticating,
      isAuthenticated: Boolean(wallet && address && wallet.toLowerCase() === address.toLowerCase()),
      wallet,
      error,
      signIn,
      signOut,
    }),
    [address, error, isAuthenticating, isReady, wallet],
  );

  return <BackendAuthContext.Provider value={value}>{children}</BackendAuthContext.Provider>;
}

export function useBackendAuthSession() {
  const ctx = useContext(BackendAuthContext);
  if (!ctx) {
    return {
      isReady: true,
      isAuthenticating: false,
      isAuthenticated: true,
      wallet: undefined,
      error: undefined,
      signIn: async () => undefined,
      signOut: async () => undefined,
    };
  }
  return ctx;
}
