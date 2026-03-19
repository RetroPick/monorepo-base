import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HISTORY_ROWS } from "@/data/v1App";

const Activity = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-52 lg:px-8">
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

        <section className="mt-8 overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead className="bg-muted/30 text-left">
                <tr>
                  {["Round ID", "Market", "Lock", "Close", "Result", "Payout", "Pool", "Oracle", "Settled", "Status"].map((heading) => (
                    <th key={heading} className="px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {HISTORY_ROWS.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20">
                    <td className="px-6 py-4 font-mono text-sm text-foreground">{row.id}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{row.market}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{row.lockPrice}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{row.closePrice}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{row.result}</td>
                    <td className="px-6 py-4 text-sm text-accent-cyan">{row.payout}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{row.pool}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{row.oracle}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{row.settledAt}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Activity;
