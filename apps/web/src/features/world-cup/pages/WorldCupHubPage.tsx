import { Outlet } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useIndexerWebSocket } from "@/hooks/useIndexerWebSocket";
import WorldCupTabs from "../components/WorldCupTabs";

export default function WorldCupHubPage() {
  const { connected: wsConnected } = useIndexerWebSocket(true);
  void wsConnected;

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header worldCupHubNav />
      <main className="mx-auto max-w-screen-2xl px-5 pb-20 pt-6 lg:px-10 lg:pt-8">
        <div className="mb-6 border-b border-border/40 pb-4">
          <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Popular global events</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">World Cup prediction hub</h1>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Forecast tournament progression, group paths, and special markets — not a sportsbook.
            </p>
          </div>
          <div className="mt-4">
            <WorldCupTabs />
          </div>
        </div>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
