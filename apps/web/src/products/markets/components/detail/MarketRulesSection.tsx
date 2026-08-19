import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { ChevronDown, ChevronUp, Info, BookOpen, FileText } from "lucide-react";

interface MarketRulesSectionProps {
  marketQuestion?: string;
  category?: string;
  resolutionSource?: string;
  endDate?: string;
}

export function MarketRulesSection({
  marketQuestion = "BTC Up or Down 5m",
  category = "Crypto",
  resolutionSource = "Chainlink TWAP BTC/USD",
  endDate = "Live 5-Minute Window",
}: MarketRulesSectionProps) {
  const [orderBookOpen, setOrderBookOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"rules" | "context">("rules");

  // Sample Live Order Book Snapshot
  const orderBookBids = [
    { price: "0.52", shares: "14,200", total: "$7,384" },
    { price: "0.51", shares: "8,500", total: "$4,335" },
    { price: "0.50", shares: "12,100", total: "$6,050" },
    { price: "0.49", shares: "6,000", total: "$2,940" },
  ];

  const orderBookAsks = [
    { price: "0.54", shares: "9,800", total: "$5,292" },
    { price: "0.55", shares: "15,400", total: "$8,470" },
    { price: "0.56", shares: "7,200", total: "$4,032" },
    { price: "0.58", shares: "18,900", total: "$10,962" },
  ];

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 1. COLLAPSIBLE ORDER BOOK ACCORDION                          */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 shadow-xl transition-all">
        <button
          type="button"
          onClick={() => setOrderBookOpen(!orderBookOpen)}
          className="flex w-full items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <span>Order Book</span>
            <Info className="h-3.5 w-3.5 text-slate-500" />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span className="font-mono text-slate-300 font-bold">$20.7K Vol.</span>
            {orderBookOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>

        {orderBookOpen && (
          <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs animate-in fade-in zoom-in-95">
            <div className="grid grid-cols-2 gap-4">
              {/* Bids Column */}
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  Bids (Yes / Up)
                </span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500 font-semibold border-b border-white/5 pb-1">
                    <span>Price</span>
                    <span>Shares</span>
                    <span>Total</span>
                  </div>
                  {orderBookBids.map((b, i) => (
                    <div key={i} className="flex justify-between text-slate-300 py-0.5 hover:bg-emerald-500/10 rounded px-1">
                      <span className="text-emerald-400 font-bold">{b.price}¢</span>
                      <span>{b.shares}</span>
                      <span className="text-slate-400">{b.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks Column */}
              <div>
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block mb-2">
                  Asks (No / Down)
                </span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500 font-semibold border-b border-white/5 pb-1">
                    <span>Price</span>
                    <span>Shares</span>
                    <span>Total</span>
                  </div>
                  {orderBookAsks.map((a, i) => (
                    <div key={i} className="flex justify-between text-slate-300 py-0.5 hover:bg-rose-500/10 rounded px-1">
                      <span className="text-rose-400 font-bold">{a.price}¢</span>
                      <span>{a.shares}</span>
                      <span className="text-slate-400">{a.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. RULES & MARKET CONTEXT TABS                               */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-5 shadow-xl transition-all">
        <div className="flex items-center gap-6 border-b border-white/[0.06] pb-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cn(
              "pb-1 transition-all cursor-pointer",
              activeTab === "rules" ? "text-white border-b-2 border-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("context")}
            className={cn(
              "pb-1 transition-all cursor-pointer",
              activeTab === "context" ? "text-white border-b-2 border-white" : "text-slate-400 hover:text-slate-200",
            )}
          >
            Market Context
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-300 leading-relaxed space-y-3 font-normal">
          {activeTab === "rules" ? (
            <>
              <p>
                This market will resolve to <strong className="text-white">"Up"</strong> if the time-weighted average price (TWAP) of {category === "Crypto" ? "Bitcoin" : "the underlying asset"}, generated by Chainlink or the designated resolution authority, of the time range specified in the title is greater than or equal to the price at the beginning of that range. Otherwise, it will resolve to <strong className="text-white">"Down"</strong> (or "No").
              </p>
              <p>
                The resolution source for this market is information from Chainlink Data Streams, specifically the TWAP stream available at <a href="https://data.chain.link" target="_blank" rel="noreferrer" className="text-blue-400 underline hover:text-blue-300">https://data.chain.link/streams</a>.
              </p>
              <p className="text-slate-400">
                Please note that this market is resolved strictly according to the official on-chain TWAP stream for the specified asset pair, not according to single spot exchange anomalies.
              </p>
            </>
          ) : (
            <>
              <p>
                Real-time prediction markets aggregate global sentiment and decentralized liquidity to establish probability consensus. Trades are settled trustlessly via audited smart contracts on-chain with zero counterparty custodial risk.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <span className="text-slate-400 block font-semibold">Resolution Source</span>
                  <span className="font-mono text-slate-200 font-bold">{resolutionSource}</span>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                  <span className="text-slate-400 block font-semibold">End Window</span>
                  <span className="font-mono text-slate-200 font-bold">{endDate}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
