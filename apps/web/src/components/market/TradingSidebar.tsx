import { useState, useEffect, useRef } from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { relayerApi, BuySharesParams } from "@/lib/relayerApi";
import { useToast } from "@/components/ui/use-toast";
import { useYellowSession } from "@/hooks/useYellowSession";

interface TradingSidebarProps {
  marketTitle: string;
  selectedOutcome?: string;
}

// --- Authentic Crypto Icons (SVGs) ---
const UsdcLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#2775CA" />
    <path d="M12.75 15.66c-0.66 0.16-1.42 0.31-2.17 0.08 -1.27-0.39-1.85-1.57-1.63-2.67 0.22-1.08 1.15-1.66 2.05-1.89 1.41-0.36 2.45-1.69 2.06-2.92 -0.42-1.33-1.63-1.87-2.64-1.67 -0.47 0.09-0.91 0.25-1.31 0.46V6h-1.5v1.23c-0.29 0.14-0.56 0.3-0.81 0.5l0.91 1.25c0.66-0.52 1.4-0.78 2.15-0.93 1.12-0.22 1.63 0.65 1.83 1.27 0.2 0.63-0.07 1.34-0.9 1.55 -1.41 0.36-2.45 1.69-2.06 2.92 0.42 1.33 1.63 1.87 2.64 1.67 0.47-0.09 0.91-0.24 1.31-0.46V18h1.5v-1.24c0.29-0.14 0.56-0.3 0.81-0.5l-0.91-1.25C13.62 15.39 13.21 15.54 12.75 15.66z" fill="white" />
  </svg>
);

const TradingSidebar = ({ marketTitle, selectedOutcome = "Yes" }: TradingSidebarProps) => {
  const [tab, setTab] = useState<'Buy' | 'Sell'>('Buy');
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState<string>("0");
  const [isTrading, setIsTrading] = useState(false);
  const [chanceToWin, setChanceToWin] = useState<number | null>(null);
  const [potentialPayout, setPotentialPayout] = useState<number | null>(null);
  const { address } = useAccount();
  const { toast } = useToast();
  const { signOrder } = useYellowSession();

  // Assuming price fetched from market outcomes, hardcoded for UI demo
  const yesPrice = 51;
  const noPrice = 49;
  const currentPrice = side === 'YES' ? yesPrice : noPrice;

  // Design token colors for consistency
  const activeYesClass = "bg-accent-green text-white";
  const activeNoClass = "bg-destructive text-white";
  const inactiveClass = "bg-secondary text-muted-foreground hover:bg-secondary/80";

  const handleTrade = async () => {
    if (!address) {
      toast({ title: "Wallet not connected", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    if (!amount || Number(amount) <= 0) return;

    setIsTrading(true);
    try {
      const TEST_SESSION_ID = relayerApi.getMarketSessionId(marketTitle);

      const outcomeIndex = side === 'YES' ? 0 : 1;
      const deltaShares = Number(amount) / (currentPrice / 100);

      try {
        await relayerApi.getSession(TEST_SESSION_ID);
      } catch (err) {
        await relayerApi.createSession({
          sessionId: TEST_SESSION_ID,
          marketId: "1",
          vaultId: "0x1111111111111111111111111111111111111111", // mock
          numOutcomes: 2,
          b: 100 // LMSR liquidity param
        });
      }

      // Ensure user has some test USDC
      try {
        await relayerApi.creditUser(TEST_SESSION_ID, address, 10000);
      } catch (e) { }

      // Get signature
      const action = tab === 'Buy' ? 'buy' : 'sell';
      const signature = await signOrder(TEST_SESSION_ID, action, outcomeIndex, deltaShares);

      if (signature) {
        if (action === 'buy') {
          const params: BuySharesParams = {
            sessionId: TEST_SESSION_ID,
            outcomeIndex: side === 'YES' ? 0 : 1,
            delta: deltaShares,
            userAddress: address,
            signature
          };
          await relayerApi.buyShares(params);
        } else {
          const params = {
            sessionId: TEST_SESSION_ID,
            outcomeIndex: side === 'YES' ? 0 : 1,
            delta: deltaShares,
            userAddress: address,
            signature
          };
          await relayerApi.sellShares(params);
        }
      }

      toast({
        title: "Trade Executed Successfully",
        description: `Bought ${deltaShares.toFixed(2)} shares of ${side} off-chain.`,
      });

    } catch (e: any) {
      toast({
        title: "Trade Failed",
        description: e.message || "Unknown error executing trade off-chain.",
        variant: "destructive"
      });
    } finally {
      setIsTrading(false);
    }
  };

  // Debounced quote fetch for Chance to Win (Buy tab only)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (tab !== 'Buy') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
      setChanceToWin(null);
      setPotentialPayout(null);
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = null;
      setChanceToWin(null);
      setPotentialPayout(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const sessionId = relayerApi.getMarketSessionId(marketTitle);
      const outcomeIndex = side === 'YES' ? 0 : 1;
      const quote = await relayerApi.getQuote(sessionId, outcomeIndex, amt, currentPrice);
      if (quote) {
        setChanceToWin(quote.chanceToWin);
        setPotentialPayout(quote.potentialPayout);
      } else {
        setChanceToWin(currentPrice / 100);
        setPotentialPayout(amt / (currentPrice / 100));
      }
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [amount, tab, side, marketTitle, currentPrice]);

  return (
    <div className="space-y-4">
      {/* Trading Panel */}
      <div className="bg-card/80 backdrop-blur-md border border-border rounded-xl p-4 shadow-xl relative z-0">

        {/* Header Tabs: Buy / Sell & Market Select */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('Buy')}
              className={cn(
                "text-[15px] font-bold pb-1 transition-colors",
                tab === 'Buy' ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Buy
            </button>
            <button
              onClick={() => setTab('Sell')}
              className={cn(
                "text-[15px] font-bold pb-1 transition-colors",
                tab === 'Sell' ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sell
            </button>
          </div>

          <button className="flex items-center gap-1 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 px-2.5 py-1 rounded transition-colors">
            Market
            <Icon name="expand_more" className="text-[16px]" />
          </button>
        </div>

        {/* YES/NO Buttons (Up/Down) */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSide('YES')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-bold flex justify-between items-center transition-colors shadow-sm",
              side === 'YES' ? activeYesClass : inactiveClass
            )}
          >
            <span>Yes</span>
            <span>{yesPrice}¢</span>
          </button>

          <button
            onClick={() => setSide('NO')}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg text-sm font-bold flex justify-between items-center transition-colors shadow-sm",
              side === 'NO' ? activeNoClass : inactiveClass
            )}
          >
            <span>No</span>
            <span>{noPrice}¢</span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            {/* Big Currency Display tied to input */}
            <span className="text-3xl font-bold text-muted-foreground/30 absolute right-0 top-6 select-none pointer-events-none">
              ${amount || '0'}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground mb-2">Balance $0.00</div>

          <input
            type="text"
            value={amount === "0" ? "" : amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.]/g, '');
              setAmount(val);
            }}
            placeholder="0"
            className="w-full bg-transparent border-b border-border text-foreground focus:outline-none py-2 text-3xl font-bold caret-primary pr-20 md:pr-[120px]"
          />

          {/* Quick Add Buttons */}
          <div className="flex gap-2 mt-4 justify-end">
            {['+1', '+5', '+10', '+100'].map(val => (
              <button
                key={val}
                onClick={() => setAmount((Number(amount || 0) + Number(val.replace('+', ''))).toString())}
                className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-bold text-muted-foreground transition-colors"
              >
                ${val.replace('+', '')}
              </button>
            ))}
            <button className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-xs font-bold text-muted-foreground transition-colors">Max</button>
          </div>
        </div>

        {/* Chance to Win - shown when amount > 0 (Buy tab, no approval needed) */}
        {tab === 'Buy' && Number(amount) > 0 && (chanceToWin != null || potentialPayout != null) && (
          <div className="mb-4 py-3 px-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-sm font-medium text-muted-foreground mb-1">Chance to Win</div>
            <div className="text-lg font-bold text-foreground">
              {chanceToWin != null && (
                <span>{(chanceToWin * 100).toFixed(1)}%</span>
              )}
              {chanceToWin != null && potentialPayout != null && (
                <span className="text-muted-foreground font-normal"> · </span>
              )}
              {potentialPayout != null && (
                <span>${potentialPayout.toFixed(2)}</span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleTrade}
          disabled={isTrading}
          className="w-full py-3.5 mt-2 rounded-lg text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm disabled:opacity-50"
        >
          {isTrading ? "Executing..." : tab === "Buy" ? "Buy" : "Sell"}
        </button>

        {/* Terms text */}
        <div className="mt-5 text-center text-[10px] sm:text-xs text-muted-foreground">
          By trading, you agree to the <a href="#" className="underline hover:text-foreground transition-colors">Terms of Use</a>.
        </div>
      </div>
    </div>
  );
};

export default TradingSidebar;
