import { useEffect, useState } from "react";
import bitcoinLogo from "@/assets/crypto/bitcoin.png";
import ethereumLogo from "@/assets/crypto/ethereum.png";
import solanaLogo from "@/assets/crypto/solana.png";
import { cn } from "@/lib/utils";

interface AssetLogoProps {
  symbol: string;
  imageSrc?: string;
  alt?: string;
  className?: string;
}

const logoBySymbol: Record<string, { alt: string; src: string }> = {
  BTC: { alt: "Bitcoin", src: bitcoinLogo },
  ETH: { alt: "Ethereum", src: ethereumLogo },
  SOL: { alt: "Solana", src: solanaLogo },
};

export function AssetLogo({ symbol, imageSrc, alt, className }: AssetLogoProps) {
  const fallbackLogo = logoBySymbol[symbol.toUpperCase()];
  const resolvedSrc = imageSrc ?? fallbackLogo?.src;
  const resolvedAlt = alt ?? fallbackLogo?.alt ?? symbol;
  const [displaySrc, setDisplaySrc] = useState(resolvedSrc);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (resolvedSrc === displaySrc) return;
    setIsVisible(false);
    const timeoutId = window.setTimeout(() => {
      setDisplaySrc(resolvedSrc);
      setIsVisible(true);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [displaySrc, resolvedSrc]);

  return (
    <div
      className={cn(
        "asset-logo-shell relative flex size-10 shrink-0 items-center justify-center rounded-full bg-background/90 ring-1 ring-border/60 shadow-[0_10px_22px_-14px_rgba(15,23,42,0.45)]",
        className,
      )}
    >
      <span className="asset-logo-orbit absolute inset-0 rounded-full" aria-hidden="true" />
      <span className="relative flex size-full items-center justify-center overflow-hidden rounded-full">
        {displaySrc ? (
          <img
            alt={resolvedAlt}
            className={cn("asset-logo-image block size-full object-contain p-[2px] transition-all duration-300", isVisible ? "scale-100 opacity-100" : "scale-90 opacity-0")}
            draggable={false}
            src={displaySrc}
          />
        ) : (
          <span className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground">{symbol}</span>
        )}
      </span>
    </div>
  );
}
