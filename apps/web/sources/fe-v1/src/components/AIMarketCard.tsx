
import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo, MouseEvent } from "react";
import BetModal from "./BetModal";
import { Cpu, Bot, Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface AIMarketCardProps {
    market: Market;
}

const AIMarketCard = memo(({ market }: AIMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    const handleBet = (e: MouseEvent<HTMLButtonElement>, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="group relative w-full min-h-[280px] md:min-h-[340px] h-[280px] md:h-[340px] perspective-1000">
                {/* Holographic Border Container */}
                <div className="absolute inset-0 bg-transparent rounded-xl border border-purple-500/20 dark:border-purple-500/40 group-hover:border-cyan-400/50 transition-colors duration-500 overflow-hidden shadow-lg shadow-black/10 dark:shadow-[0_0_20px_rgba(168,85,247,0.15)] flex flex-col bg-white dark:bg-black/90 backdrop-blur-md">

                    {/* Animated "Scanning" Line (Dark Mode Only) */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 dark:group-hover:animate-scan z-20 pointer-events-none" />

                    {/* Header: Tech Spec Look */}
                    <div className="relative z-10 h-12 border-b border-purple-100 dark:border-purple-500/20 flex items-center justify-between px-4 bg-purple-50/50 dark:bg-purple-900/10">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-purple-100 dark:bg-purple-500/20">
                                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-300 uppercase tracking-widest">
                                {t('categories.ai')} Analysis
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-cyan-400">{t('dashboard.live')}</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col relative z-10">
                        {/* Title */}
                        <h3 className="text-lg font-bold text-foreground leading-tight mb-4 group-hover:text-purple-600 dark:group-hover:text-cyan-400 transition-colors font-sans">
                            {market.title}
                        </h3>

                        {/* Background Grid Pattern (Subtle) */}
                        <div className="absolute right-0 top-10 opacity-5 dark:opacity-20 pointer-events-none z-0">
                            <Bot className="w-32 h-32 text-purple-500" />
                        </div>

                        {/* Outcomes */}
                        <div className="space-y-3 mt-auto relative z-10">
                            {market.outcomes.map((outcome) => (
                                <div key={outcome.id} className="group/item">
                                    <div className="flex justify-between text-xs mb-1 font-mono">
                                        <span className="text-slate-600 dark:text-slate-300">{outcome.label}</span>
                                        <span className="text-purple-600 dark:text-cyan-400 font-bold tracking-widest">{Math.round(outcome.probability)}%</span>
                                    </div>
                                    <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden mb-2">
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-purple-500 to-cyan-500 opacity-80"
                                            style={{ width: `${outcome.probability}%` }}
                                        />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                            className="flex-1 py-1.5 rounded border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500 hover:text-white text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 transition-all"
                                        >
                                            YES
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                            className="flex-1 py-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-[10px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 transition-all"
                                        >
                                            NO
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
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

export default AIMarketCard;
