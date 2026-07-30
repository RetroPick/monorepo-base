import { Market } from "@/types/market";
import { cn } from "@/lib/utils";
import { useState, memo, MouseEvent } from "react";
import BetModal from "./BetModal";
import { Box, Hammer, Coins } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface CommoditiesMarketCardProps {
    market: Market;
}

const CommoditiesMarketCard = memo(({ market }: CommoditiesMarketCardProps) => {
    const { t } = useLanguage();
    const [betModal, setBetModal] = useState<{ open: boolean; side: 'YES' | 'NO'; outcome: string } | null>(null);

    // Determine Asset Type for styling
    const isGold = market.title.includes("Gold");
    const isSilver = market.title.includes("Silver");
    const isOil = market.title.includes("Oil") || market.title.includes("Energy");

    // Theme colors
    const themeColor = isGold ? "text-yellow-600 dark:text-yellow-400" : isSilver ? "text-slate-500 dark:text-slate-300" : "text-amber-700 dark:text-amber-600";
    const themeBg = isGold ? "bg-yellow-100 dark:bg-yellow-900/20" : isSilver ? "bg-slate-100 dark:bg-slate-800" : "bg-amber-100 dark:bg-amber-900/20";
    const borderColor = isGold ? "border-yellow-200 dark:border-yellow-700/30" : isSilver ? "border-slate-200 dark:border-slate-700" : "border-amber-200 dark:border-amber-700/30";

    // Smart image resolver: prefer the supplied image when valid, otherwise fall back to a keyword-based Unsplash photo
    const getCommodityImage = (): string => {
        const src = market.image;
        const isUsable = src && !src.includes('placeholder') && !src.startsWith('/images/markets/');
        if (isUsable) return src;

        const title = market.title.toLowerCase();
        const imageMap: Record<string, string> = {
            gold: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80",
            silver: "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=600&q=80",
            oil: "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600&q=80",
            crude: "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600&q=80",
            gas: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&q=80",
            natural: "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=600&q=80",
            wheat: "https://images.unsplash.com/photo-1543257580-7269da773bf5?w=600&q=80",
            copper: "https://images.unsplash.com/photo-1605557202138-660e3081a3e0?w=600&q=80",
            iron: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
            steel: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&q=80",
            corn: "https://images.unsplash.com/photo-1601593768498-3e4a0e0e4e4e?w=600&q=80",
            coffee: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&q=80",
            sugar: "https://images.unsplash.com/photo-1550411294-875ea759e3db?w=600&q=80",
            lithium: "https://images.unsplash.com/photo-1620293023076-e12f8a623f79?w=600&q=80",
            uranium: "https://images.unsplash.com/photo-1591189824761-ab532cf94830?w=600&q=80",
            energy: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=80",
            metal: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80",
            platinum: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=600&q=80",
            diamond: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600&q=80",
        };

        for (const [keyword, url] of Object.entries(imageMap)) {
            if (title.includes(keyword)) return url;
        }

        // Default: generic commodities/trading image
        return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80";
    };

    const commodityImage = getCommodityImage();

    const handleBet = (e: MouseEvent<HTMLButtonElement>, outcomeLabel: string) => {
        e.stopPropagation();
        setBetModal({ open: true, side: 'YES', outcome: outcomeLabel });
    };

    return (
        <>
            <div className="group relative w-full h-[360px] perspective-1000">
                <div className={cn("absolute inset-0 bg-card rounded-t-xl rounded-b-lg border-2 overflow-hidden isolate shadow-lg shadow-black/10 dark:shadow-black/60 flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1", borderColor)}>

                    {/* Header: Industrial Tag */}
                    <div className={cn("relative z-10 h-10 flex items-center justify-between px-4 border-b", themeBg, borderColor)}>
                        <div className="flex items-center gap-2">
                            <Box className={cn("w-4 h-4", themeColor)} />
                            <span className={cn("text-xs font-bold uppercase tracking-widest", themeColor)}>
                                {isGold ? t('dashboard.precious_metal') : isSilver ? t('dashboard.industrial_metal') : t('dashboard.energy_resource')}
                            </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">{t('dashboard.futures')}</span>
                    </div>

                    {/* Image Section (Split) - -inset-px for pixel-perfect edge coverage */}
                    <div className="relative h-40 overflow-hidden rounded-t-xl">
                        <img
                            src={commodityImage}
                            alt={market.title}
                            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-110"
                            onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80"; }}
                        />
                        <div className="absolute -inset-px bg-gradient-to-t from-white dark:from-[#1a1a1a] to-transparent opacity-80 rounded-t-xl" />

                        <div className="absolute bottom-4 left-4 right-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <h3 className="text-xl font-serif font-bold text-foreground leading-tight drop-shadow-md">
                                {market.title}
                            </h3>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="space-y-4 mt-auto">
                            {market.outcomes.map((outcome) => (
                                <div key={outcome.id}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">{outcome.label}</span>
                                        <span className={cn("text-sm font-bold", themeColor)}>{Math.round(outcome.probability)}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-3 bg-slate-100 dark:bg-black rounded-sm overflow-hidden border border-slate-200 dark:border-white/10 relative">
                                            <div
                                                className={cn("absolute left-0 top-0 bottom-0 transition-all duration-500 opacity-60", themeBg.replace("bg-", "bg-"))}
                                                style={{ width: `${Math.round(outcome.probability)}%`, backgroundColor: isGold ? '#eab308' : isSilver ? '#94a3b8' : '#b45309' }}
                                            />
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'YES', outcome: outcome.label }); }}
                                                className="px-3 py-1 rounded-sm bg-slate-900 dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity border border-slate-700 dark:border-slate-300"
                                            >
                                                YES
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setBetModal({ open: true, side: 'NO', outcome: outcome.label }); }}
                                                className="px-3 py-1 rounded-sm bg-transparent text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

export default CommoditiesMarketCard;
