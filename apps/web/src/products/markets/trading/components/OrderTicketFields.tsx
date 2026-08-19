import type { OrderSide } from "../lib/tradingApiClient";
import {
  ORDER_FIELD_PRICE,
  ORDER_FIELD_SIZE,
  ORDER_SIDE_BUY,
  ORDER_SIDE_SELL,
} from "../lib/tradingCopy";

interface OrderTicketFieldsProps {
  side: OrderSide;
  price: string;
  size: string;
  onSideChange: (side: OrderSide) => void;
  onPriceChange: (price: string) => void;
  onSizeChange: (size: string) => void;
  disabled?: boolean;
}

export function OrderTicketFields({
  side,
  price,
  size,
  onSideChange,
  onPriceChange,
  onSizeChange,
  disabled,
}: OrderTicketFieldsProps) {
  return (
    <div className="space-y-3">
      <fieldset disabled={disabled}>
        <legend className="sr-only">Order side</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={side === "BUY"}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-all duration-150 ${
              side === "BUY"
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-[0_0_14px_hsl(var(--yes)/0.2)]"
                : "border-border text-muted-foreground hover:border-emerald-500/30 hover:text-white"
            }`}
            onClick={() => onSideChange("BUY")}
          >
            {ORDER_SIDE_BUY}
          </button>
          <button
            type="button"
            aria-pressed={side === "SELL"}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-all duration-150 ${
              side === "SELL"
                ? "border-rose-500/60 bg-rose-500/15 text-rose-300 shadow-[0_0_14px_hsl(var(--no)/0.2)]"
                : "border-border text-muted-foreground hover:border-rose-500/30 hover:text-white"
            }`}
            onClick={() => onSideChange("SELL")}
          >
            {ORDER_SIDE_SELL}
          </button>
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{ORDER_FIELD_PRICE}</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={price}
          disabled={disabled}
          onChange={(e) => onPriceChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none ring-primary transition-all focus:border-primary/50 focus:ring-2"
          placeholder="0.42"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{ORDER_FIELD_SIZE}</span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={size}
          disabled={disabled}
          onChange={(e) => onSizeChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none ring-primary transition-all focus:border-primary/50 focus:ring-2"
          placeholder="Shares"
        />
      </label>
    </div>
  );
}
