"use client";

import { useCallback, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";

import { readMarketsE2EHarness } from "../../e2e/e2eHarness";
import { openMarketsAppKitModal } from "../config/appKit";
import { mapConnectError } from "../lib/walletErrors";

export function useMarketsWalletConnect() {
  const e2e = readMarketsE2EHarness();
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const [connectError, setConnectError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      await openMarketsAppKitModal();
    } catch (error) {
      const mapped = mapConnectError(error);
      setConnectError(mapped.message);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setConnectError(null);
    disconnect();
  }, [disconnect]);

  if (e2e?.wallet?.connected) {
    return {
      address: e2e.wallet.address as `0x${string}`,
      chainId: e2e.wallet.chainId,
      isConnected: true,
      isConnecting: false,
      connectError: null,
      connect: async () => {},
      disconnect: () => {},
    };
  }

  return {
    address,
    chainId,
    isConnected: Boolean(isConnected && address),
    isConnecting,
    connectError,
    connect,
    disconnect: disconnectWallet,
  };
}
