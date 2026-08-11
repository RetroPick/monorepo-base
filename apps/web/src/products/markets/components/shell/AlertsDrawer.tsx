import { X } from "lucide-react";

import { DataStateEmpty } from "../DataState";

interface AlertsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AlertsDrawer({ open, onClose }: AlertsDrawerProps) {
  if (!open) return null;

  return (
    <>
      <button type="button" className="fixed inset-0 z-50 bg-black/60" aria-label="Close alerts" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,92vw)] flex-col border-l border-border bg-card animate-sheet-up"
        aria-label="Alerts"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-sm font-bold">Alerts</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-secondary/50" aria-label="Close alerts">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <DataStateEmpty
            title="No alerts yet"
            description="Whale alerts and price notifications will appear here when enabled on your account."
          />
        </div>
      </aside>
    </>
  );
}
