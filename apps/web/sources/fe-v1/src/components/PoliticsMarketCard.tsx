
import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo } from "react";
import BetModal from "./BetModal";
import { TrendingUp, Users, Clock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface PoliticsMarketCardProps {
    market: Market;
}

const PoliticsMarketCard = memo(({ market }: PoliticsMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    const handleBet = (e: React.MouseEvent, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="group relative flex flex-col w-full aspect-square bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden isolate shadow-lg shadow-black/5 hover:shadow-2xl hover:shadow-black/15 dark:hover:shadow-black/50 transition-all duration-300 transform hover:-translate-y-1">

                {/* Image Section - Distinct from text to prevent clashing */}
                <div className="relative h-48 overflow-hidden isolate z-0 rounded-t-xl">
                    <div className="absolute top-3 left-3 z-20">
                        <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white bg-red-600/90 shadow-sm rounded-md backdrop-blur-sm">
                            {t('dashboard.live_coverage')}
                        </span>
                    </div>
                    <img
                        src={market.image}
                        alt={market.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {/* Minimal gradient -inset-px for pixel-perfect edge coverage */}
                    <div className="absolute -inset-px bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-t-xl" />
                </div>

                {/* Content Section - Clean News Style */}
                <div className="flex flex-col flex-1 p-5 relative z-10">
                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 font-medium">
                        <div className="flex items-center gap-1">
                            <Users size={12} />
                            <span>{market.volume} {t('market_card.volume')}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <Clock size={12} />
                            <span>{t('home.ending_soon')}</span>
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-foreground leading-snug mb-3 font-serif group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {market.title}
                    </h3>

                    {/* Outcomes / Polls */}
                    <div className="mt-auto space-y-3">
                        {market.outcomes.map((outcome) => (
                            <div key={outcome.id} className="relative group/outcome">
                                {/* Label & % */}
                                <div className="flex justify-between items-end mb-1 text-xs font-semibold">
                                    <span className="text-slate-700 dark:text-slate-300">{outcome.label}</span>
                                    <span className="text-slate-900 dark:text-white">{Math.round(outcome.probability)}%</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={cn(
                                            "absolute left-0 top-0 bottom-0 rounded-full transition-all duration-500",
                                            outcome.label.toLowerCase() === 'yes' ? "bg-blue-600" :
                                                outcome.label.toLowerCase() === 'no' ? "bg-red-500" : "bg-slate-500"
                                        )}
                                        style={{ width: `${Math.round(outcome.probability)}%` }}
                                    />
                                </div>

                                {/* Hover Action */}
                                <div className="absolute right-0 top-[-25px] opacity-0 group-hover/outcome:opacity-100 transition-opacity flex gap-1 translate-y-2 group-hover/outcome:translate-y-0 duration-200">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg transition-colors"
                                    >
                                        YES
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                        className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg transition-colors"
                                    >
                                        NO
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer / Trade Button */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="text-[10px] items-center gap-1 text-slate-400 hidden group-hover:flex animate-fade-in">
                            <TrendingUp size={12} />
                            <span>{t('dashboard.high_activity')}</span>
                        </div>
                        <button className="ml-auto flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline group/btn">
                            {t('dashboard.trade_prediction')} <ArrowRight size={12} className="transition-transform group-hover/btn:translate-x-1" />
                        </button>
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

export default PoliticsMarketCard;
