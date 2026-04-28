import { useState } from "react";
import { Link } from "react-router-dom";
import { Market } from "@/types/market";
import Icon from "./Icon";
import BetModal from "./BetModal";
import ProbabilityChart from "./market/ProbabilityChart";
import { useLanguage } from "@/context/LanguageContext";

interface FeaturedMarketProps {
  market: Market;
}

const FeaturedMarket = ({ market }: FeaturedMarketProps) => {
  const { t } = useLanguage();
  const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

  const handleBet = (side: 'YES' | 'NO', outcomeLabel: string) => {
    setBetModal({ open: true, side, outcome: outcomeLabel });
  };

  return (
    <>
      <section className="mb-12">
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-2xl relative group isolate">
          <div className="absolute -top-24 -right-24 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none opacity-90 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-2 relative z-10">
            {/* Left: Market Info */}
            <div className="p-8 lg:p-10 flex flex-col border-r border-border/30">
              <div className="flex items-start gap-4 mb-6">
                <div className="size-10 rounded-lg bg-secondary flex items-center justify-center border border-border shrink-0">
                  <Icon name={market.icon} className="text-muted-foreground" />
                </div>
                <div>
                  <Link to={`/app/market/${market.id}`} className="hover:text-primary transition-colors">
                    <h1 className="text-2xl lg:text-3xl font-bold leading-tight tracking-tight mb-2">
                      {market.title}
                    </h1>
                  </Link>
                  <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>{t('market_card.volume')}: {market.volume}</span>
                    <span>•</span>
                    <span>{t('market_card.ends')}: {market.expiry}</span>
                  </div>
                </div>
              </div>

              {/* Outcomes */}
              <div className="space-y-3 mb-8">
                {market.outcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors border border-transparent hover:border-border group/row"
                  >
                    <span className="text-sm font-medium text-muted-foreground">
                      {outcome.label}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold w-12 text-right text-accent-cyan">
                        {Math.round(outcome.probability)}%
                      </span>
                      <div className="flex rounded overflow-hidden border border-border">
                        <button
                          onClick={() => handleBet('YES', outcome.label)}
                          className="px-4 py-1.5 text-[11px] font-bold bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan transition-colors min-w-[50px]"
                        >
                          YES
                        </button>
                        <div className="w-px bg-border" />
                        <button
                          onClick={() => handleBet('NO', outcome.label)}
                          className="px-4 py-1.5 text-[11px] font-bold bg-accent-magenta/10 hover:bg-accent-magenta/20 text-accent-magenta transition-colors min-w-[50px]"
                        >
                          NO
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* News */}
              <div className="mt-auto border-t border-border/30 pt-6">
                <div className="flex items-start gap-3 text-sm">
                  <div className="shrink-0 mt-1 size-1.5 rounded-full bg-accent-cyan animate-pulse" />
                  <div>
                    <span className="font-bold text-xs uppercase tracking-wider mb-1 block">
                      {t('dashboard.news')}
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-xs">
                      FOMC members remain divided on the pace of easing as recent inflation data shows mixed signals. Chairman Powell noted that the labor market remains the primary focus for the upcoming December meeting...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Exact ProbabilityChart (same as MarketDetail) - unified bg to avoid layering seam */}
            <div className="p-8 lg:p-10 relative flex flex-col justify-center">
              <ProbabilityChart outcomes={market.outcomes} volume={market.volume} embedded />
            </div>
          </div>
        </div>
      </section>

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
};

export default FeaturedMarket;
