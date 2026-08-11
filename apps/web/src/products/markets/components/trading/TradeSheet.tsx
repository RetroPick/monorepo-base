import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/shared/lib/utils";

interface TradeSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function TradeSheet({ open, onClose, title = "Place order", children, className }: TradeSheetProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/60 lg:hidden"
        aria-label="Close trade sheet"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-hidden rounded-t-2xl border border-border bg-card animate-sheet-up lg:hidden",
          className,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-secondary/50" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(88vh-3rem)] overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}

export function TradeAside({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <aside className={cn("hidden lg:block lg:sticky lg:top-24 lg:self-start", className)}>{children}</aside>
  );
}

export function TradeMobileBar({
  onOpen,
  label = "Trade",
}: {
  onOpen: () => void;
  label?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/98 p-4 pb-6 lg:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm"
      >
        {label}
      </button>
    </div>
  );
}
