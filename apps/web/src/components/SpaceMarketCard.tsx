
import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo , MouseEvent } from "react";
import BetModal from "./BetModal";
import { Rocket, Satellite, Radio } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SpaceMarketCardProps {
    market: Market;
}

const SpaceMarketCard = memo(({ market }: SpaceMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    const handleBet = (e: MouseEvent<HTMLButtonElement>, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="group relative w-full h-[400px] overflow-hidden isolate rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-black/20 dark:hover:shadow-indigo-500/20 shadow-lg shadow-black/10 dark:shadow-black/50 bg-white dark:bg-black border border-slate-200 dark:border-white/10">

                {/* Background Image (Full Cover) - -inset-px for pixel-perfect edge coverage */}
                <div className="absolute inset-0 z-0 overflow-hidden rounded-2xl">
                    <img
                        src={market.image}
                        alt={market.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute -inset-px bg-gradient-to-t from-black via-black/60 to-transparent rounded-2xl" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end z-10">

                    {/* Floating Header */}
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                        <div className="bg-black/50 backdrop-blur-md border border-white/20 rounded-full px-3 py-1 flex items-center gap-2">
                            <Satellite className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">{t('categories.space')}</span>
                        </div>
                        <div className="bg-red-500/20 backdrop-blur-md border border-red-500/50 rounded-full px-2 py-1">
                            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                        </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-2 leading-tight drop-shadow-lg">
                        {market.title}
                    </h3>

                    <p className="text-sm text-slate-300 mb-6 line-clamp-2">
                        {market.description}
                    </p>

                    {/* Outcomes */}
                    <div className="space-y-3 bg-white/10 dark:bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                        {market.outcomes.map((outcome) => (
                            <div key={outcome.id} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-white font-bold">{outcome.label}</span>
                                        <span className="text-cyan-400 font-mono">{Math.round(outcome.probability)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-cyan-500 shadow-[0_0_10px_currentColor]"
                                            style={{ width: `${Math.round(outcome.probability)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20"
                                    >
                                        YES
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold uppercase tracking-wider transition-colors shadow-lg shadow-black/20"
                                    >
                                        NO
                                    </button>
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

export default SpaceMarketCard;
