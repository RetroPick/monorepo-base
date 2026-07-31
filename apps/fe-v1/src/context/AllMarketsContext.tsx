import React, { createContext, useContext } from "react";
import { Market } from "@/types/market";

interface AllMarketsContextType {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
  refreshMarkets: () => Promise<void>;
}

const AllMarketsContext = createContext<AllMarketsContextType | undefined>(undefined);

/** Read-only Markets V1: legacy live-market fetch is disabled; BFF discovery owns catalog data. */
export const AllMarketsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value: AllMarketsContextType = {
    markets: [],
    isLoading: false,
    error: null,
    refreshMarkets: async () => undefined,
  };

  return <AllMarketsContext.Provider value={value}>{children}</AllMarketsContext.Provider>;
};

export const useAllMarkets = () => {
  const context = useContext(AllMarketsContext);
  if (context === undefined) {
    throw new Error("useAllMarkets must be used within an AllMarketsProvider");
  }
  return context;
};
