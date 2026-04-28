import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchUserEvents } from "@/lib/api/retropickApi";
import { useIndexerWebSocket } from "@/hooks/useIndexerWebSocket";

const Activity = () => {
  const { address, isConnected } = useAccount();
  useIndexerWebSocket(isConnected && !!address);

  const indexedQ = useQuery({
    queryKey: ["retropick-api", "user-events", address],
    queryFn: () => fetchUserEvents(address!, 80),
    enabled: !!address,
    staleTime: 8_000,
  });

  const indexedRows = indexedQ.data ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-3 lg:px-8">
        <section className="rounded-[32px] border border-border/70 bg-card p-6 shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)] lg:p-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            History
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight lg:text-5xl">
            Settled rounds, payout context, and oracle-backed outcomes.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            The history view focuses on the data users need to trust settlement: round ID, lock price, close price, payout
            multiplier, total pool, oracle source, and exact settlement time.
          </p>
        </section>

        {isConnected && address ? (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)]">
            <div className="border-b border-border/50 px-6 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Indexed on-chain activity
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                From the RetroPick API (<code className="text-xs">PositionDeposited</code>,{" "}
                <code className="text-xs">SideSwitched</code>, <code className="text-xs">Claimed</code>
                …). Requires indexer + <code className="text-xs">docker compose</code>.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-muted/30 text-left">
                  <tr>
                    {["Event", "Template", "Epoch", "Block", "Tx", "Indexed"].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {indexedQ.isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                        Loading…
                      </td>
                    </tr>
                  ) : null}
                  {!indexedQ.isLoading && indexedRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-sm text-muted-foreground">
                        No indexed events for this wallet yet.
                      </td>
                    </tr>
                  ) : null}
                  {indexedRows.map((row) => (
                    <tr key={`${row.txHash}-${row.logIndex}`} className="hover:bg-muted/20">
                      <td className="px-6 py-3 font-mono text-xs text-foreground">{row.eventName}</td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {row.templateId ?? "—"}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {row.epochId ?? "—"}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {row.blockNumber}
                      </td>
                      <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground">
                        {row.txHash.slice(0, 10)}…
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">{row.indexedAt ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-8 rounded-[32px] border border-border/70 bg-card/50 px-6 py-5 text-sm text-muted-foreground shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)]">
          Discovery / Up vs Down mock history was removed. Use the indexed table above for authoritative on-chain events, or open{" "}
          <Link to="/app/portfolio" className="font-semibold text-primary hover:underline">
            Portfolio
          </Link>{" "}
          for live position views.
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Activity;
