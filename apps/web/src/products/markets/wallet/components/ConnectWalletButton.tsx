"use client";

import type { ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";

import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";

interface ConnectWalletButtonProps {
  className?: string;
  label?: ReactNode;
}

export function ConnectWalletButton({ className, label = "Connect wallet" }: ConnectWalletButtonProps) {
  const { connect, isConnecting, connectError } = useMarketsWalletConnect();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="default"
        className={className}
        disabled={isConnecting}
        onClick={() => void connect()}
      >
        {isConnecting ? "Connecting…" : label}
      </Button>
      {connectError ? (
        <p className="max-w-[14rem] text-right text-xs text-destructive" role="alert">
          {connectError}
        </p>
      ) : null}
    </div>
  );
}
