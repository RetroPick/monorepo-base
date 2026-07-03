import { useQuery } from "@tanstack/react-query";

import { apiBaseUrl } from "./config";

export type GoodDollarStatus = {
  wallet: string;
  chainId: number;
  gDollarBalance: string;
  goodIdVerified: boolean;
  rootWallet?: string;
  canClaimOrReceiveG: boolean;
};

export function useGoodDollarStatus(wallet?: string) {
  return useQuery({
    queryKey: ["gooddollar", "status", wallet],
    enabled: Boolean(wallet),
    queryFn: async (): Promise<GoodDollarStatus | null> => {
      if (!wallet) return null;
      const base = apiBaseUrl();
      const url = `${base}/api/v1/gooddollar/status?wallet=${encodeURIComponent(wallet)}`;
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load G$ status");
      return (await res.json()) as GoodDollarStatus;
    },
  });
}
