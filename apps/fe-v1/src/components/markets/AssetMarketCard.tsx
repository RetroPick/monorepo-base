import { RetroPickRoundCardDTO } from "@/lib/market-data/types";
import { cn } from "@/lib/utils";

export function AssetMarketCard({ card }: { card: RetroPickRoundCardDTO }) {
  return (
    <div className="rounded-[26px] border border-border/60 bg-card/82 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{card.roundType}</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {card.assetSymbol} {card.intervalLabel} round
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{card.displayPair}</div>
        </div>
        <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {card.status}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Current price</div>
          <div className="mt-1 font-semibold text-foreground">
            {card.currentPriceUsd ? `$${card.currentPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "--"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">24H change</div>
          <div className={cn("mt-1 font-semibold", (card.priceChangePct24h ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {card.priceChangePct24h != null ? `${card.priceChangePct24h >= 0 ? "+" : ""}${card.priceChangePct24h.toFixed(2)}%` : "--"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Lock</div>
          <div className="mt-1 font-semibold text-foreground">{new Date(card.lockTime).toLocaleTimeString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Close</div>
          <div className="mt-1 font-semibold text-foreground">{new Date(card.closeTime).toLocaleTimeString()}</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-border/60 bg-background/70 p-4 text-xs leading-6 text-muted-foreground">
        <div className="font-semibold text-foreground">Oracle: {card.oracleSource}</div>
        <div className="mt-1">{card.settlementNote}</div>
      </div>
    </div>
  );
}
