import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useTopAssets } from "@/hooks/useTopAssets";
import { AssetUniverseEntry } from "@/lib/market-data/types";

interface AssetContextValue {
  assets: AssetUniverseEntry[];
  assetsLoading: boolean;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedAsset: AssetUniverseEntry | undefined;
}

const AssetContext = createContext<AssetContextValue | undefined>(undefined);

export function AssetProvider({ children }: { children: ReactNode }) {
  const { data: assets, loading: assetsLoading } = useTopAssets(20);
  const [selectedSymbol, setSelectedSymbol] = useState("BTC");

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.symbol === selectedSymbol) || assets[0],
    [assets, selectedSymbol],
  );

  const value = useMemo(
    () => ({
      assets,
      assetsLoading,
      selectedSymbol,
      setSelectedSymbol,
      selectedAsset,
    }),
    [assets, assetsLoading, selectedAsset, selectedSymbol],
  );

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssetContext() {
  const context = useContext(AssetContext);

  if (!context) {
    throw new Error("useAssetContext must be used within an AssetProvider");
  }

  return context;
}
