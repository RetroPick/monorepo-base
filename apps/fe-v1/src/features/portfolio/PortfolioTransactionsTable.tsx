import { Loader2 } from "lucide-react";

import type { UserChainEventRow } from "@/lib/api/retropickApi";

export function explorerTxUrl(base: string, hash: string): string {
  const b = base.replace(/\/$/, "");
  return `${b}/tx/${hash}`;
}

export type PortfolioTransactionsTableProps = {
  events: UserChainEventRow[];
  eventsLoading: boolean;
  explorerTxBase: string;
  /** Tighter padding when embedded in sidebar. */
  compact?: boolean;
};

export function PortfolioTransactionsTable({
  events,
  eventsLoading,
  explorerTxBase,
  compact = false,
}: PortfolioTransactionsTableProps) {
  const cell = compact ? "px-2 py-2" : "px-3 py-3";
  const head = compact ? "px-2 py-2" : "px-3 py-2";

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:border-white/[0.08]">
            <th className={head}>Event</th>
            <th className={head}>Market</th>
            <th className={head}>Epoch</th>
            <th className={head}>Block</th>
            <th className={head}>Tx</th>
            <th className={head}>Indexed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 dark:divide-white/[0.06]">
          {eventsLoading ? (
            <tr>
              <td colSpan={6} className={`${cell} text-center text-muted-foreground`}>
                <Loader2 className="mx-auto size-5 animate-spin opacity-70" aria-hidden />
              </td>
            </tr>
          ) : null}
          {!eventsLoading && events.length === 0 ? (
            <tr>
              <td colSpan={6} className={`${cell} py-10 text-center text-muted-foreground`}>
                No activity
              </td>
            </tr>
          ) : null}
          {events.map((row) => (
            <tr key={`${row.txHash}-${row.logIndex}`} className="hover:bg-muted/25">
              <td className={`${cell} font-mono text-xs text-foreground`}>{row.eventName}</td>
              <td className={`${cell} font-mono text-xs text-muted-foreground`}>{row.templateId ?? "—"}</td>
              <td className={`${cell} font-mono text-xs text-muted-foreground`}>{row.epochId ?? "—"}</td>
              <td className={`${cell} font-mono text-xs text-muted-foreground`}>{row.blockNumber}</td>
              <td className={`${cell} font-mono text-[11px]`}>
                <a
                  href={explorerTxUrl(explorerTxBase, row.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {row.txHash.slice(0, 10)}…
                </a>
              </td>
              <td className={`${cell} text-xs text-muted-foreground`}>{row.indexedAt ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
