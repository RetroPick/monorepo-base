import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo, MouseEvent } from "react";
import BetModal from "./BetModal";
import { TrendingUp, TrendingDown, Activity, Globe, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface MacroMarketCardProps {
    market: Market;
}

const MacroMarketCard = memo(({ market }: MacroMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    // Dynamic Logic for "Financial" styling
    const isInflation = market.title.includes("CPI") || market.title.includes("Inflation");
    const isForex = market.title.includes("USD") || market.title.includes("JPY") || market.title.includes("EUR");
    const isGrowth = market.title.includes("GDP") || market.title.includes("Recession");

    const accentColor = isInflation ? "text-red-500" : isForex ? "text-green-500" : isGrowth ? "text-blue-500" : "text-amber-500";
    const accentBg = isInflation ? "bg-red-500" : isForex ? "bg-green-500" : isGrowth ? "bg-blue-500" : "bg-amber-500";
    const ticker = isInflation ? "CPI.US" : isForex ? "USDJPY" : isGrowth ? "EU.GDP" : "MACRO";

    const handleBet = (e: MouseEvent<HTMLButtonElement>, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="group relative w-full h-[320px] transition-all duration-300 hover:-translate-y-1">
                {/* Main Card Container */}
                <div className="absolute inset-0 bg-card rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg shadow-black/10 dark:shadow-black/60 overflow-hidden flex flex-col">

                    {/* Header: Financial Strip */}
                    <div className="relative z-10 h-10 border-b border-slate-100 dark:border-white/5 flex items-center justify-between px-4 bg-slate-50/50 dark:bg-white/2">
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400", accentColor)}>
                                {ticker}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                {t('dashboard.real_time')}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-slate-400 animate-pulse" />
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{market.volume}</span>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 flex-1 flex flex-col relative z-10">
                        {/* Title & Badge */}
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-foreground leading-snug max-w-[85%] font-serif">
                                {market.title}
                            </h3>
                            <div className={cn("w-2 h-2 rounded-full", accentBg)} />
                        </div>

                        {/* Outcomes (The "Data" Look) */}
                        <div className="space-y-3 mt-auto">
                            {market.outcomes.map((outcome) => (
                                <div key={outcome.id} className="group/item">
                                    <div className="flex justify-between text-xs mb-1.5 font-mono">
                                        <span className="text-slate-500 dark:text-slate-400">{outcome.label}</span>
                                        <span className={cn("font-bold", accentColor)}>{Math.round(outcome.probability)}%</span>
                                    </div>
                                    <div className="relative h-6 w-full bg-slate-100 dark:bg-white/5 rounded-sm overflow-hidden flex items-center cursor-pointer"
                                        onClick={(e) => handleBet(e as any, outcome.label)}>

                                        {/* Progress Bar */}
                                        <div
                                            className={cn("absolute left-0 top-0 bottom-0 opacity-30 transition-all duration-500", accentBg)}
                                            style={{ width: `${Math.round(outcome.probability)}%` }}
                                        />

                                        {/* Hover Effect: "Trade" Text */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-black/5 dark:bg-white/5 backdrop-blur-[1px] gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                                className="px-2 py-0.5 rounded bg-green-500 text-white text-[9px] font-bold uppercase tracking-wide hover:bg-green-600 transition-colors"
                                            >
                                                YES
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                                className="px-2 py-0.5 rounded bg-red-500 text-white text-[9px] font-bold uppercase tracking-wide hover:bg-red-600 transition-colors"
                                            >
                                                NO
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Decorative Background Elements (The "Cool" Factor) */}
                    <div className="absolute top-1/2 right-[-20px] w-32 h-32 bg-gradient-to-br from-transparent to-slate-200/20 dark:to-white/5 rounded-full blur-2xl pointer-events-none z-0" />
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

export default MacroMarketCard;
