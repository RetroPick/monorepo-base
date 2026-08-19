import { cn } from "@/shared/lib/utils";
import type { TradeOption } from "./PolymarketTradeBox";

interface MarketCandidateRowsTableProps {
  options: TradeOption[];
  selectedOptionIdx?: number;
  onSelectOption: (idx: number, side: "buy_yes" | "buy_no") => void;
}

export function MarketCandidateRowsTable({
  options,
  selectedOptionIdx = 0,
  onSelectOption,
}: MarketCandidateRowsTableProps) {
  if (!options || options.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0E1422] p-4 sm:p-5 shadow-xl transition-all space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Market Outcomes & Probability
      </h3>

      <div className="space-y-2">
        {options.map((opt, idx) => {
          const yesPrice = opt.percentage;
          const noPrice = Math.max(0.1, Math.round((100 - yesPrice) * 10) / 10);
          const isSelected = selectedOptionIdx === idx;

          return (
            <div
              key={idx}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition-all",
                isSelected
                  ? "border-blue-500/40 bg-blue-600/[0.07]"
                  : "border-white/[0.06] bg-[#0A0F1D]/80 hover:border-white/15 hover:bg-[#0E1424]",
              )}
            >
              {/* Option Title & Volume */}
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">
                  {opt.label}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 font-mono">
                  ${(opt.percentage * 142).toLocaleString()} Vol.
                </span>
              </div>

              {/* Percentage Probability */}
              <div className="font-mono text-sm sm:text-base font-black text-white shrink-0 min-w-[48px] text-right">
                {yesPrice < 1 ? "<1%" : `${yesPrice}%`}
              </div>

              {/* Buy Yes / Buy No Quick Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectOption(idx, "buy_yes")}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-[#0D281E] border border-emerald-500/30 px-3 text-xs font-bold text-emerald-400 hover:bg-[#133A2C] transition-colors cursor-pointer"
                >
                  <span>Buy Yes</span>
                  <span className="font-mono font-black">{yesPrice < 1 ? "0.4¢" : `${yesPrice}¢`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectOption(idx, "buy_no")}
                  className="inline-flex h-8 items-center justify-center gap-1 rounded-xl bg-[#24151C] border border-rose-500/25 px-3 text-xs font-bold text-rose-400 hover:bg-[#351C26] transition-colors cursor-pointer"
                >
                  <span>Buy No</span>
                  <span className="font-mono font-black">{noPrice > 99 ? "99.6¢" : `${noPrice}¢`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
