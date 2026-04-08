import { useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MarketCard from "@/components/MarketCard";
import { MARKET_FAMILIES } from "@/data/v1App";
import { useMarkets } from "@/context/MarketContext";
import { cn } from "@/lib/utils";

const Index = () => {
  const { markets } = useMarkets();
  const [family, setFamily] = useState<(typeof MARKET_FAMILIES)[number]>("All");

  const filteredMarkets = useMemo(() => {
    if (family === "All") return markets;
    return markets.filter((market) => market.category === family);
  }, [family, markets]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-14 pt-3 lg:px-8">
        <section className="rounded-[32px] border border-border/70 bg-card p-6 shadow-[0_30px_90px_-60px_rgba(5,12,30,0.9)] lg:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Curated V1 catalog
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight lg:text-5xl">
              Market templates built only around deterministic oracle settlement.
            </h1>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              No politics, sports, or human-judged outcomes. Every market here resolves from a public oracle formula with explicit
              lock and close behavior.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {MARKET_FAMILIES.map((item) => (
              <button
                key={item}
                onClick={() => setFamily(item)}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors",
                  family === item
                    ? "border-foreground bg-foreground text-background"
                    : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
