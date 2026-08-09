"use client";

import { useEffect, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { initMarketsAppKit } from "../config/appKit";
import { getMarketsWagmiConfig } from "../config/wagmiConfig";
import { MarketsWalletSessionProvider } from "./MarketsWalletSessionProvider";

interface MarketsWalletProviderProps {
  children: ReactNode;
}

export function MarketsWalletProvider({ children }: MarketsWalletProviderProps) {
  useEffect(() => {
    void initMarketsAppKit();
  }, []);

  return (
    <WagmiProvider config={getMarketsWagmiConfig()} reconnectOnMount={false}>
      <MarketsWalletSessionProvider>{children}</MarketsWalletSessionProvider>
    </WagmiProvider>
  );
}
