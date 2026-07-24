import { useAccount } from "wagmi";

const LEADERBOARD = [
  { rank: 1, name: "CryptoKing", pnl: "+$15,200", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoKing" },
  { rank: 2, name: "SolanaWhale", pnl: "+$12,800", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SolanaWhale" },
  { rank: 3, name: "PredictorX", pnl: "+$10,500", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PredictorX" },
  { rank: 4, name: "PredictorX2", pnl: "+$8,000", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=PredictorX2" },
  { rank: 5, name: "CryptoLink", pnl: "+$5,000", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoLink" },
  { rank: 6, name: "Lemmeny", pnl: "+$2,500", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lemmeny" },
];

const PAST_ROUNDS = [
  { id: "#456789", market: "BTC/USD", direction: "UP", result: "win", payout: "+$120.00 USDC", action: "claimed" },
  { id: "#456788", market: "ETH/USD", direction: "DOWN", result: "loss", payout: "-$50.00 USDC", action: null },
  { id: "#456787", market: "SOL/USD", direction: "UP", result: "win", payout: "+$85.50 USDC", action: "claim" },
  { id: "#456786", market: "ADA/USD", direction: "DOWN", result: "win", payout: "+$30.10 USDC", action: "claimed" },
  { id: "#456785", market: "BNB/USD", direction: "UP", result: "loss", payout: "-$75.00 USDC", action: null },
];

export function PortfolioStats() {
  const { isConnected } = useAccount();

  return (
    <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6" style={{ gridRow: "span 1" }}>
      <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-1">
            <span>Total PNL</span>
            <svg className="h-4 w-4 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-accent-cyan">{isConnected ? "+$2,450.50 USDC" : "-"}</div>
        </div>
        <div className="mt-4">
          <svg className="w-full h-8 opacity-50" viewBox="0 0 100 30">
            <path className="stroke-accent-cyan fill-none stroke-[2]" d="M0 25 Q 10 20, 20 22 T 40 15 T 60 18 T 80 5 T 100 10" />
          </svg>
        </div>
      </div>
      <div className="glass-card rounded-3xl p-6 flex items-center justify-between">
        <div>
          <div className="text-muted-foreground text-sm font-medium mb-1">Win Rate</div>
          <div className="text-3xl font-bold">{isConnected ? "68%" : "-"}</div>
        </div>
        <div className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center" style={{ background: "conic-gradient(#2dd4bf 0% 68%, hsl(var(--border)) 68% 100%)" }}>
          <div className="absolute inset-[10px] rounded-full bg-card" />
          <span className="relative z-10 text-xs font-bold">{isConnected ? "68%" : "-"}</span>
        </div>
      </div>
      <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
        <div>
          <div className="text-muted-foreground text-sm font-medium mb-1">Available to Claim</div>
          <div className="text-3xl font-bold">{isConnected ? "$450.25 USDC" : "-"}</div>
        </div>
        <button className="mt-4 w-full bg-accent-cyan hover:bg-cyan-400 text-accent-foreground font-bold py-2 rounded-xl transition disabled:opacity-50" disabled={!isConnected}>
          Claim All
        </button>
      </div>
    </div>
  );
}

export function PortfolioSidebar() {
  return (
    <aside className="col-span-12 lg:col-span-3 row-span-2 flex flex-col gap-6">
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-xl font-bold mb-6">Leaderboard</h3>
        <ul className="space-y-4">
          {LEADERBOARD.map((item, i) => (
            <li key={item.rank} className={`flex items-center justify-between text-sm ${i === 3 ? "bg-white/5 p-2 -mx-2 rounded-lg" : ""}`}>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-4">{item.rank}.</span>
                <img alt="" className="w-8 h-8 rounded-full border border-border object-cover" src={item.avatar} />
                <span className={`font-medium ${i === 3 ? "text-accent-cyan" : ""}`}>{item.name}</span>
              </div>
              <span className="text-accent-green">{item.pnl}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass-card rounded-3xl p-6">
        <h3 className="text-xl font-bold mb-6">Market Statistics</h3>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-muted-foreground text-sm">24h Volume</div>
              <svg className="w-16 h-8" viewBox="0 0 50 20">
                <path className="stroke-accent-cyan fill-none stroke-[2]" d="M0 15 Q 10 5, 20 12 T 40 2 T 50 10" />
              </svg>
            </div>
            <div className="text-2xl font-bold">$1.2M</div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-muted-foreground text-sm">Total Value Locked</div>
              <svg className="w-16 h-8" viewBox="0 0 50 20">
                <path className="stroke-accent-cyan fill-none stroke-[2]" d="M0 18 Q 10 15, 20 10 T 40 5 T 50 2" />
              </svg>
            </div>
            <div className="text-2xl font-bold">$5.5M</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function PastRoundsTable() {
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  return (
    <div className="col-span-12 lg:col-span-9 glass-card rounded-3xl p-8">
      <h2 className="text-2xl font-bold mb-6">Past Rounds</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-muted-foreground text-sm border-b border-border">
              <th className="pb-4 font-medium">Round ID</th>
              <th className="pb-4 font-medium">Market</th>
              <th className="pb-4 font-medium">Direction</th>
              <th className="pb-4 font-medium">Result</th>
              <th className="pb-4 font-medium">Payout</th>
              <th className="pb-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {PAST_ROUNDS.map((row) => (
              <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition group">
                <td className="py-5 text-muted-foreground">{row.id}</td>
                <td className="py-5 font-bold">{row.market}</td>
                <td className={`py-5 font-bold ${row.direction === "UP" ? "text-accent-cyan" : "text-accent-magenta"}`}>{row.direction}</td>
                <td className="py-5">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${row.result === "win" ? "bg-accent-green/10 text-accent-green border-accent-green/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {row.result === "win" ? "Win" : "Loss"}
                  </span>
                </td>
                <td className={`py-5 font-medium ${row.payout.startsWith("+") ? "text-accent-cyan" : "text-destructive"}`}>{row.payout}</td>
                <td className="py-5">
                  {row.action === "claim" && (
                    <button className="bg-accent-cyan hover:bg-cyan-400 text-accent-foreground px-4 py-1.5 rounded-lg font-bold transition">Claim</button>
                  )}
                  {row.action === "claimed" && (
                    <button className="bg-accent-cyan/20 text-accent-cyan px-4 py-1.5 rounded-lg font-bold border border-accent-cyan/30 cursor-not-allowed opacity-80" disabled>Claimed</button>
                  )}
                  {row.action === null && <span className="text-muted-foreground font-bold">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
