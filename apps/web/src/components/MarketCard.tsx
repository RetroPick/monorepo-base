import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Market } from "@/types/market";
import Icon from "./Icon";
import BetModal from "./BetModal";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface MarketCardProps {
  market: Market;
  /** When provided, passes this state when navigating to market detail (e.g. { market }) */
  navigationState?: Record<string, unknown>;
}

const MarketCard = memo(({ market, navigationState }: MarketCardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

  const handleBet = (e: React.MouseEvent, side: 'YES' | 'NO', outcomeLabel: string) => {
    e.stopPropagation();
    setBetModal({ open: true, side, outcome: outcomeLabel });
  };

  const handleCardClick = () => {
    navigate(`/app/market/${market.id}`, navigationState ? { state: navigationState } : {});
  };

  const categoryLabel =
    t(`categories.${market.category.toLowerCase()}` as "categories.trending") || market.category;

  return (
    <>
      <div
        onClick={handleCardClick}
        className="group relative flex flex-col w-full aspect-[4/3] md:aspect-square bg-card dark:bg-card/60 backdrop-blur-md rounded-3xl border border-black/10 dark:border-white/5 overflow-hidden isolate shadow-sm shadow-black/10 dark:shadow-none hover:border-black/20 dark:hover:border-white/10 hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 cursor-pointer"
      >
        {/* Image Header with Gradient Overlay - -inset-0.5 for pixel-perfect edge coverage, no bleed */}
        <div className="relative h-48 w-full overflow-hidden isolate z-0 rounded-t-3xl">
          <div className="absolute -inset-0.5 bg-gradient-to-t from-black/85 via-black/55 via-black/30 via-black/10 to-transparent z-10 rounded-t-3xl" />
          <div className="absolute -inset-0.5 bg-gradient-to-b from-black/15 via-transparent to-transparent z-10 group-hover:opacity-0 transition-opacity duration-500 rounded-t-3xl" />
          {market.image ? (
            <img
              src={market.image}
              alt={market.title}
              className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out translate-z-0 backface-hidden"
              style={{ transformOrigin: 'center center' }}
            />
          ) : (
            <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
              <Icon name={market.icon} className="text-6xl text-muted-foreground/20" />
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-4 left-4 z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <Icon name={market.icon} className={cn("text-xs", market.iconColor || "text-white")} />
              <span className="text-[10px] font-medium tracking-wide uppercase text-white/90">
                {categoryLabel}
              </span>
            </div>
          </div>

          {/* Volume Badge */}
          <div className="absolute top-4 right-4 z-20">
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <Icon name="attach_money" className="text-[10px] text-accent-green" />
              <span className="text-[10px] font-mono text-white/90">{t("market_card.volume")}: {market.totalPool || market.volume}</span>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-1 p-5 relative z-20">
          {/* Title & Description */}
          <div className="mb-6">
            <h3 className="text-lg font-bold leading-tight text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {market.title}
            </h3>
            {market.description && market.category !== "Commodities" && market.category !== "Metals" && (
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {market.description}
              </p>
            )}
          </div>

          {/* Outcomes / Interaction */}
          <div className="mt-auto space-y-3">
            {market.isBinary ? (
              <div className="grid grid-cols-2 gap-3">
                {market.outcomes.map((outcome) => {
                  const isYes = outcome.label === 'Yes';
                  const colorClass = isYes ? 'text-accent-green' : 'text-primary';
                  const bgHoverClass = isYes ? 'hover:bg-accent-green/10 hover:border-accent-green/30' : 'hover:bg-primary/10 hover:border-primary/30';

                  return (
                    <button
                      key={outcome.id}
                      aria-label={`${isYes ? "Enter YES" : "Enter NO"}: ${market.title}`}
                      onClick={(e) => handleBet(e, isYes ? 'YES' : 'NO', outcome.label)}
                      className={cn(
                        "relative overflow-hidden rounded-xl border border-white/5 bg-white/5 py-3 px-4 transition-all duration-300 group/btn",
                        bgHoverClass
                      )}
                    >
                      <div className="flex flex-col items-center gap-1 z-10 relative">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground group-hover/btn:text-white transition-colors">
                          {outcome.label}
                        </span>
                        <span className={cn("text-xl font-black tracking-tight", colorClass)}>
                          {Math.round(outcome.probability)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {market.outcomes.slice(0, 3).map((outcome) => (
                  <div key={outcome.id} className="group/row flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 rounded-full bg-white/10 group-hover/row:bg-primary transition-colors" />
                      <span className="text-sm font-medium text-muted-foreground group-hover/row:text-white transition-colors">
                        {outcome.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-white">{Math.round(outcome.probability)}%</span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleBet(e, 'YES', outcome.label)}
                          aria-label={`Enter YES ${market.title}`}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          YES
                        </button>
                        <button
                          onClick={(e) => handleBet(e, 'NO', outcome.label)}
                          aria-label={`Enter NO ${market.title}`}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {betModal && (
        <BetModal
          open={betModal.open}
          onClose={() => setBetModal(null)}
          marketTitle={market.title}
          outcome={betModal.outcome}
          side={betModal.side}
          price={0.5}
        />
      )}
    </>
  );
});

export default MarketCard;
