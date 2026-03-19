import { useState } from "react";
import { useAccount } from "wagmi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useMarkets } from "@/context/MarketContext";
import Icon from "@/components/Icon";

// Market resolution status labels
const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    open: { label: "Open", color: "text-green-400", icon: "play_circle" },
    frozen: { label: "Frozen", color: "text-yellow-400", icon: "pause_circle" },
    resolved: { label: "Resolved", color: "text-blue-400", icon: "check_circle" },
    closed: { label: "Closed", color: "text-gray-400", icon: "cancel" },
};

export default function Resolution() {
    const { isConnected } = useAccount();
    const { markets } = useMarkets();
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Derive status from market data and expiry window
    const marketsWithStatus = markets.map((m) => {
        const now = Date.now();
        const endDate = m.expiry ? new Date(m.expiry).getTime() : 0;
        const isExpired = endDate > 0 && endDate < now;

        let status = "open";
        // Use max probability > 0.95 as a heuristic for "resolved"
        const maxProb = Math.max(...m.outcomes.map(o => o.probability), 0);
        if (maxProb > 0.95 && isExpired) {
            status = "resolved";
        } else if (isExpired) {
            status = "frozen";
        }

        const confidence = Math.round(maxProb * 100);

        return {
            ...m,
            status,
            statusInfo: STATUS_LABELS[status] || STATUS_LABELS.open,
            confidence,
            isExpired,
        };
    });

    // Filter
    const filteredMarkets = statusFilter === "all"
        ? marketsWithStatus
        : marketsWithStatus.filter((m) => m.status === statusFilter);

    // Stats
    const openCount = marketsWithStatus.filter((m) => m.status === "open").length;
    const frozenCount = marketsWithStatus.filter((m) => m.status === "frozen").length;
    const resolvedCount = marketsWithStatus.filter((m) => m.status === "resolved").length;

    const formatDate = (d: string | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("en-US", {
            month: "short", day: "numeric", year: "numeric",
        });
    };

    return (
        <div className="min-h-screen bg-background text-slate-900 dark:text-gray-100 font-sans transition-colors duration-300 pb-20">
            <Header />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-10">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Icon name="gavel" className="text-3xl text-blue-500" />
                        <h1 className="text-3xl font-bold tracking-tight">Market Resolution</h1>
                    </div>
                    <p className="text-slate-500 dark:text-gray-400 max-w-2xl font-light">
                        Track market lifecycle status. Markets move from Open → Frozen → Resolved as outcomes are determined by the CRE oracle.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div
                        onClick={() => setStatusFilter(statusFilter === "open" ? "all" : "open")}
                        className={`bg-white dark:bg-white/5 border rounded-2xl p-5 cursor-pointer transition-all
              ${statusFilter === "open" ? "border-green-500 ring-1 ring-green-500/30" : "border-slate-200 dark:border-white/10 hover:border-green-300"}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Open Markets</div>
                        <div className="text-3xl font-bold text-green-500 font-mono">{openCount}</div>
                        <div className="text-xs text-slate-400 mt-1">Active trading</div>
                    </div>
                    <div
                        onClick={() => setStatusFilter(statusFilter === "frozen" ? "all" : "frozen")}
                        className={`bg-white dark:bg-white/5 border rounded-2xl p-5 cursor-pointer transition-all
              ${statusFilter === "frozen" ? "border-yellow-500 ring-1 ring-yellow-500/30" : "border-slate-200 dark:border-white/10 hover:border-yellow-300"}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Frozen / Awaiting Oracle</div>
                        <div className="text-3xl font-bold text-yellow-500 font-mono">{frozenCount}</div>
                        <div className="text-xs text-slate-400 mt-1">Resolution pending</div>
                    </div>
                    <div
                        onClick={() => setStatusFilter(statusFilter === "resolved" ? "all" : "resolved")}
                        className={`bg-white dark:bg-white/5 border rounded-2xl p-5 cursor-pointer transition-all
              ${statusFilter === "resolved" ? "border-blue-500 ring-1 ring-blue-500/30" : "border-slate-200 dark:border-white/10 hover:border-blue-300"}`}
                    >
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resolved</div>
                        <div className="text-3xl font-bold text-blue-500 font-mono">{resolvedCount}</div>
                        <div className="text-xs text-slate-400 mt-1">Claimable</div>
                    </div>
                </div>

                {/* Status Legend */}
                <div className="flex items-center gap-4 mb-6 text-xs">
                    <button
                        onClick={() => setStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${statusFilter === "all" ? "bg-slate-900 dark:bg-white text-white dark:text-black font-bold" : "bg-slate-100 dark:bg-white/5 text-slate-500"}`}
                    >
                        All ({marketsWithStatus.length})
                    </button>
                    {Object.entries(STATUS_LABELS).map(([key, val]) => (
                        <button
                            key={key}
                            onClick={() => setStatusFilter(key)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${statusFilter === key ? "bg-slate-900 dark:bg-white text-white dark:text-black font-bold" : `${val.color} bg-slate-100 dark:bg-white/5`}`}
                        >
                            <Icon name={val.icon} className="text-sm" />
                            {val.label}
                        </button>
                    ))}
                </div>

                {/* Market Cards */}
                {filteredMarkets.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <Icon name="search_off" className="text-5xl mb-3" />
                        <p className="text-lg">No markets match this filter</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredMarkets.map((m) => (
                            <div
                                key={m.id}
                                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${m.statusInfo.color} border-current/30`}>
                                                <Icon name={m.statusInfo.icon} className="text-xs" />
                                                {m.statusInfo.label}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {m.id.slice(0, 8)}...
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{m.title}</h3>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 ml-4">
                                        {m.status === "resolved" && isConnected && (
                                            <button className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                                <Icon name="redeem" className="text-sm" />
                                                Redeem
                                            </button>
                                        )}
                                        {m.status === "frozen" && (
                                            <span className="px-3 py-1.5 text-yellow-500 text-xs flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg border border-yellow-200 dark:border-yellow-500/30">
                                                <Icon name="hourglass_top" className="text-sm animate-pulse" />
                                                Awaiting Oracle
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                                    <div>
                                        <span className="text-slate-400">Category</span>
                                        <p className="font-medium text-slate-900 dark:text-white">{m.category}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">End Date</span>
                                        <p className="font-mono text-slate-600 dark:text-gray-300">{formatDate(m.expiry)}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Volume</span>
                                        <p className="font-mono text-slate-600 dark:text-gray-300">{m.volume}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Confidence</span>
                                        <p className="font-mono text-slate-600 dark:text-gray-300">{m.confidence}%</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-400">Outcomes</span>
                                        <div className="flex gap-1 mt-0.5">
                                            {m.outcomes?.slice(0, 3).map((o, i) => (
                                                <span key={i} className="text-[10px] font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10">
                                                    {o.label.slice(0, 12)}{o.label.length > 12 ? "..." : ""}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info Banner */}
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-5 flex items-start gap-3">
                    <Icon name="info" className="text-blue-500 text-xl mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">How Resolution Works</h4>
                        <p className="text-xs text-slate-600 dark:text-blue-200/70 leading-relaxed">
                            <strong>Open</strong> → Markets actively trading via LS-LMSR. <strong>Frozen</strong> → Trading closed, awaiting CRE oracle to determine outcome.
                            <strong> Resolved</strong> → Outcome finalized on-chain via MarketRegistry. Holders can redeem winnings via <code className="text-blue-500">MarketRegistry.redeem(marketId)</code>.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
