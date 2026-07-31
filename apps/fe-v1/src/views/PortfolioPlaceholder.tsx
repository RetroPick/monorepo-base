import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function PortfolioPlaceholder() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[720px] px-5 py-16 lg:px-10">
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Portfolio, balances, positions, and claims are unavailable in Markets V1 Phase 1.2. This surface is
          read-only until trading and settlement are enabled in a later phase.
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          No balances, positions, PnL, or claim actions are shown in this phase.
        </div>
      </main>
      <Footer />
    </div>
  );
}
