import { cn } from "@/lib/utils";
import type { CryptoAssetFilterId, CryptoHorizonId } from "@/lib/discover-crypto";

type DiscoverLeftNavProps = {
  assetOptions: { id: CryptoAssetFilterId; label: string; count: number }[];
  horizonOptions: { id: CryptoHorizonId; label: string; count: number }[];
  activeAsset: CryptoAssetFilterId;
  activeHorizon: CryptoHorizonId;
  onAssetChange: (id: CryptoAssetFilterId) => void;
  onHorizonChange: (id: CryptoHorizonId) => void;
};

export default function DiscoverLeftNav({
  assetOptions,
  horizonOptions,
  activeAsset,
  activeHorizon,
  onAssetChange,
  onHorizonChange,
}: DiscoverLeftNavProps) {
  return (
    <>
      {/* Mobile: horizontal chips */}
      <nav
        data-testid="discover-crypto-nav-mobile"
        className="mb-4 flex min-w-0 flex-col gap-3 lg:hidden"
        aria-label="Crypto market filters"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horizon</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {horizonOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onHorizonChange(opt.id)}
                aria-current={activeHorizon === opt.id ? true : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeHorizon === opt.id
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {opt.label} <span className="tabular-nums text-muted-foreground">({opt.count})</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Asset</span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {assetOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onAssetChange(opt.id)}
                aria-current={activeAsset === opt.id ? true : undefined}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeAsset === opt.id
                    ? "border-primary/30 bg-primary/15 text-primary"
                    : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {opt.label} <span className="tabular-nums text-muted-foreground">({opt.count})</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Desktop: sticky left rail */}
      <nav
        data-testid="discover-crypto-nav-desktop"
        className="hidden w-[min(100%,14rem)] shrink-0 flex-col gap-6 lg:flex lg:self-start lg:sticky lg:top-28 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto"
        aria-label="Crypto market filters"
      >
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Horizon</h3>
          <ul className="mt-2 space-y-0.5">
            {horizonOptions.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => onHorizonChange(opt.id)}
                  aria-current={activeHorizon === opt.id ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    activeHorizon === opt.id
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{opt.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">{opt.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assets</h3>
          <ul className="mt-2 space-y-0.5">
            {assetOptions.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => onAssetChange(opt.id)}
                  aria-current={activeAsset === opt.id ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    activeAsset === opt.id
                      ? "bg-primary/15 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{opt.label}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">{opt.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
