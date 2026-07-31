
import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo  } from "react";
import BetModal from "./BetModal";
import { useLanguage } from "@/context/LanguageContext";

interface NeonMarketCardProps {
    market: Market;
}

const NeonMarketCard = memo(({ market }: NeonMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    const handleBet = (e: React.MouseEvent, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="relative group overflow-hidden isolate rounded-2xl bg-card border border-slate-200 dark:border-blue-500/30 hover:border-blue-500/50 shadow-xl shadow-black/10 dark:shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-2xl hover:shadow-black/20 dark:hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all duration-300">

                {/* Background Image with Overlay - -inset-px for pixel-perfect edge coverage */}
                <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                    <img
                        src={market.image}
                        alt={market.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-10 dark:opacity-40 group-hover:opacity-20 dark:group-hover:opacity-50 transition-opacity duration-500"
                    />
                    <div className="absolute -inset-px bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#050b14] dark:via-[#050b14]/80 dark:to-transparent rounded-2xl" />
                </div>

                {/* Content */}
                <div className="relative z-10 p-5 flex flex-col h-full">
                    {/* Header: Live Badge & Volume */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <div className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                {t('dashboard.live')}
                            </div>
                            <div className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border border-slate-200 dark:border-blue-500/30 text-slate-500 dark:text-blue-400">
                                {market.category}
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{t('market_card.volume')}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{market.volume}</span>
                        </div>
                    </div>

                    {/* Team/Match Title - More prominent */}
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight drop-shadow-sm transition-colors duration-300 uppercase italic">
                        {market.title}
                    </h3>

                    {/* Metadata: Time / League (Mockup for now) */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium border-b border-slate-100 dark:border-white/5 pb-4">
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Q4 02:30
                        </span>
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Stadium Arena
                        </span>
                    </div>

                    {/* Outcomes */}
                    <div className="mt-auto grid grid-cols-3 gap-3">
                        {market.outcomes.slice(0, 3).map((outcome, idx) => (
                            <div key={outcome.id} className="flex flex-col gap-2">
                                <div className="flex flex-col p-2 rounded-xl bg-slate-50 dark:bg-[#0f172a]/50 border border-slate-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-blue-500/50 transition-all group/outcome cursor-pointer">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase truncate">
                                            {outcome.label}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center justify-center py-1">
                                        <span className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">{Math.round(outcome.probability)}%</span>
                                    </div>

                                    <div className="w-full mt-2 flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                            className="flex-1 py-1.5 rounded-lg bg-blue-600 dark:bg-blue-600/80 text-white text-[10px] font-bold uppercase hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20"
                                        >
                                            YES
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                            className="flex-1 py-1.5 rounded-lg bg-rose-600 dark:bg-rose-600/80 text-white text-[10px] font-bold uppercase hover:bg-rose-700 dark:hover:bg-rose-500 transition-colors shadow-md shadow-rose-500/20"
                                        >
                                            NO
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
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

export default NeonMarketCard;
