"use client";

import { useSwitchChain } from "wagmi";

import { Button } from "@/shared/components/ui/button";

import { POLYGON_CHAIN_ID, getMarketsChainLabel } from "../config/chains";
import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";

export function ChainGuardBanner() {
  const { isConnected, chainId } = useMarketsWalletConnect();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === POLYGON_CHAIN_ID) return null;

  const chainLabel = chainId != null ? getMarketsChainLabel(chainId) : "Unknown network";

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <p className="font-medium">Wrong network</p>
      <p className="mt-1 text-muted-foreground">
        RetroPick Markets uses Polygon (chain {POLYGON_CHAIN_ID}). You are on {chainLabel}.
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-3"
        disabled={isPending}
        onClick={() => switchChain({ chainId: POLYGON_CHAIN_ID })}
      >
        {isPending ? "Switching…" : "Switch to Polygon"}
      </Button>
    </div>
  );
}
