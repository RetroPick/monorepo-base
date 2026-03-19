import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo, MouseEvent } from "react";
import BetModal from "./BetModal";
import { Building2, TrendingUp, DollarSign } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface CorporateMarketCardProps {
    market: Market;
}

const CorporateMarketCard = memo(({ market }: CorporateMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    const handleBet = (e: MouseEvent<HTMLButtonElement>, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="group relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl shadow-black/5 dark:shadow-black/20 transition-all duration-300 hover:-translate-y-1">

                {/* Header: Ticker Tape Style */}
                <div className="relative z-10 bg-slate-50 dark:bg-slate-950 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('dashboard.earnings_call')}</span>
                            <span className="text-[10px] text-slate-500 font-mono">EST. 2026</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="block text-xs font-bold text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                            <TrendingUp className="w-3 h-3" /> {t('dashboard.strong_buy')}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5">
                    <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">
                        {market.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                        {market.description}
                    </p>

                    {/* Chart-like Bars */}
                    <div className="flex gap-2 h-24 items-end mb-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        {market.outcomes.map((outcome, idx) => (
                            <div key={outcome.id} className="flex-1 flex flex-col items-center gap-2 group/bar relative">
                                <span className={cn("text-xs font-bold", idx === 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-400")}>{Math.round(outcome.probability)}%</span>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-sm relative overflow-hidden h-full flex items-end transition-all group-hover/bar:bg-slate-200 dark:group-hover/bar:bg-slate-700">
                                    <div
                                        className={cn("w-full transition-all duration-500", idx === 0 ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-300 dark:bg-slate-600 hover:bg-slate-400")}
                                        style={{ height: `${Math.round(outcome.probability)}%` }}
                                    />
                                    {/* Hover Buttons Overlay */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-black/60 backdrop-blur-[1px] z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                            className="w-[80%] py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold hover:bg-blue-500 transition-colors"
                                        >
                                            Y
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                            className="w-[80%] py-0.5 rounded bg-red-500 text-white text-[9px] font-bold hover:bg-red-400 transition-colors"
                                        >
                                            N
                                        </button>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-none">{outcome.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-2">
                        <span>{t('market_card.volume')}: {market.volume}</span>
                        <span className="text-blue-600 cursor-pointer hover:underline">{t('dashboard.view_analysis')}</span>
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

export default CorporateMarketCard;
