import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "./Icon";
import ConfirmationModal from "./ConfirmationModal";
import { cn } from "@/lib/utils";
import { useYellowSession } from "@/hooks/useYellowSession";
import { useAccount } from "wagmi";
import { relayerApi } from "@/lib/relayerApi";

// --- Authentic Crypto Icons (SVGs) ---
const SolanaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 396 311" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <linearGradient id="solana_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#9945FF" />
      <stop offset="100%" stopColor="#14F195" />
    </linearGradient>
    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zm260.1-164.8c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h309.1c5.8 0 8.7-7 4.6-11.1l-62.7-62.7zM64.6 3.8C67 1.4 70.3 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#solana_grad)" />
  </svg>
);

const UsdcLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#2775CA" />
    <path d="M12.75 15.66c-0.66 0.16-1.42 0.31-2.17 0.08 -1.27-0.39-1.85-1.57-1.63-2.67 0.22-1.08 1.15-1.66 2.05-1.89 1.41-0.36 2.45-1.69 2.06-2.92 -0.42-1.33-1.63-1.87-2.64-1.67 -0.47 0.09-0.91 0.25-1.31 0.46V6h-1.5v1.23c-0.29 0.14-0.56 0.3-0.81 0.5l0.91 1.25c0.66-0.52 1.4-0.78 2.15-0.93 1.12-0.22 1.63 0.65 1.83 1.27 0.2 0.63-0.07 1.34-0.9 1.55 -1.41 0.36-2.45 1.69-2.06 2.92 0.42 1.33 1.63 1.87 2.64 1.67 0.47-0.09 0.91-0.24 1.31-0.46V18h1.5v-1.24c0.29-0.14 0.56-0.3 0.81-0.5l-0.91-1.25C13.62 15.39 13.21 15.54 12.75 15.66z" fill="white" />
  </svg>
);

const UsdtLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} xmlns="http://www.w3.org/2000/svg">
    <g fill="none" fillRule="evenodd">
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path fill="#FFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.061v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117" />
    </g>
  </svg>
);

const TOKENS = [
  { symbol: "SOL", name: "Solana", Icon: SolanaLogo, balance: 14.24 },
  { symbol: "USDC", name: "USD Coin", Icon: UsdcLogo, balance: 1000.00 },
  { symbol: "USDT", name: "Tether", Icon: UsdtLogo, balance: 50.00 },
];

interface BetModalProps {
  open: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  side: 'YES' | 'NO';
  price: number;
}

const defaultToken = TOKENS[0] ?? { symbol: "USDC", name: "USD Coin", Icon: UsdcLogo, balance: 0 };

const BetModal = ({ open, onClose, marketTitle, outcome, side: initialSide, price }: BetModalProps) => {
  const { address } = useAccount();
  const [side, setSide] = useState<'YES' | 'NO'>(initialSide);
  const [amount, setAmount] = useState(0.65);
  const [selectedToken, setSelectedToken] = useState(defaultToken);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(0.65);
      setSide(initialSide);
      setSelectedToken(defaultToken);
    }
  }, [open, initialSide]);

  // Calculations
  const shares = amount / price;
  const payout = shares * 1;
  const profit = payout - amount;
  const profitPercent = amount > 0 ? ((payout - amount) / amount) * 100 : 0;

  // Theme colors
  const isYes = side === 'YES';

  const { signOrder, isPending } = useYellowSession();

  const handleBuy = async () => {
    try {
      if (!address) {
        alert('Please connect your wallet first!');
        return;
      }

      // Convert market title      // We will hardcode a test session for this implementation phase based on title Hash
      const sessionId = relayerApi.getMarketSessionId(marketTitle);
      const outcomeIndex = side === 'YES' ? 0 : 1;

      // Auto-create session on the fly if it doesn't exist (hackathon UX flow)
      try {
        await relayerApi.getSession(sessionId);
      } catch (err) {
        await relayerApi.createSession({
          sessionId,
          marketId: "1",
          vaultId: "0x1111111111111111111111111111111111111111", // mock
          numOutcomes: 2,
          b: 100 // LMSR liquidity param
        });
      }

      // Ensure user has some test USDC
      try {
        await relayerApi.creditUser(sessionId, address, 10000);
      } catch (e) { }

      // Sign the order for realistic UX
      const deltaShares = amount / price;
      const signature = await signOrder(sessionId, 'buy', outcomeIndex, deltaShares);

      if (signature) {
        // Execute the trade against the backend relayer
        const res = await relayerApi.buyShares({
          sessionId,
          outcomeIndex,
          delta: deltaShares, // amount is in USDC, LMSR expects share delta
          userAddress: address,
          signature
        });

        if (!res?.ok) {
          throw new Error('Trade failed');
        }

        setShowConfirmation(true);
      }
    } catch (err: any) {
      console.error("Trade failed:", err);
      alert(`Trade Error: ${err.message || 'Unknown error'}`);
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    onClose();
  };

  // Adjust amount with token decimals awareness (mocked)
  const adjustAmount = (delta: number) => {
    const newAmount = Math.max(0, amount + delta);
    // Round to reasonable decimals based on token type
    // SOL: 4 decimals, Others: 2 decimals usually sufficient for UI
    setAmount(parseFloat(newAmount.toFixed(selectedToken.symbol === 'SOL' ? 4 : 2)));
  };

  if (showConfirmation) {
    return (
      <ConfirmationModal
        open={showConfirmation}
        onClose={handleConfirmationClose}
        marketTitle={marketTitle}
        outcome={outcome}
        side={side}
        amount={amount}
        shares={Math.round(shares)}
        potentialWin={Math.round(profit)}
        profitPercent={Math.round(profitPercent)}
      />
    );
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-sm rounded-2xl overflow-visible shadow-2xl border border-border bg-card"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
            >
              <Icon name="close" className="text-slate-500 dark:text-slate-400 w-4 h-4" />
            </button>

            {/* HEADER: Market & Side Toggle */}
            <div className="p-4 pb-0">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center truncate px-6">
                {marketTitle}
              </h3>

              {/* YES / NO Toggle */}
              <div className="flex bg-slate-100 dark:bg-muted rounded-xl p-1 relative z-10">
                <button
                  onClick={() => setSide('YES')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300",
                    isYes
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  YES
                </button>
                <button
                  onClick={() => setSide('NO')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-300",
                    !isYes
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/25"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  NO
                </button>
              </div>
            </div>

            {/* Buying Info */}
            <div className="px-4 pt-4 pb-2">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Buying <span className={cn("font-bold", isYes ? "text-blue-600 dark:text-blue-400" : "text-rose-500 dark:text-rose-400")}>{side}</span> at <span className="font-bold text-slate-900 dark:text-white">{price.toFixed(2)} {selectedToken.symbol}</span>
              </p>
            </div>

            {/* Token Balance & Selection Row */}
            <div className="px-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mb-2">
              <span className="flex items-center gap-1">Available Balance</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{selectedToken.balance} {selectedToken.symbol}</span>
            </div>

            {/* Amount Input & Token Selector */}
            <div className="px-4 pb-3 relative z-30">
              <div className="flex items-center bg-slate-50 dark:bg-muted/80 border border-border rounded-xl px-4 py-3 relative">

                {/* Decrement */}
                <button
                  onClick={() => adjustAmount(selectedToken.symbol === 'SOL' ? -0.01 : -1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <Icon name="remove" className="text-lg" />
                </button>

                {/* Input */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-transparent text-center text-2xl font-bold text-slate-900 dark:text-white focus:outline-none no-spinner p-0"
                    step={selectedToken.symbol === 'SOL' ? "0.01" : "1"}
                  />
                </div>

                {/* Token Dropdown Trigger */}
                <div className="relative">
                  <button
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className="flex items-center gap-2 bg-white dark:bg-white/5 border border-border rounded-lg pl-2 pr-3 py-1.5 hover:bg-slate-50 dark:hover:bg-white/10 transition-all"
                  >
                    <selectedToken.Icon className="w-5 h-5" />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{selectedToken.symbol}</span>
                    <Icon name="expand_more" className="text-slate-400 text-sm" />
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isTokenDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-muted rounded-xl shadow-xl border border-border overflow-hidden z-50 py-1"
                      >
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Token</div>
                        {TOKENS.map((token) => (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              setSelectedToken(token);
                              setIsTokenDropdownOpen(false);
                              setAmount(token.symbol === 'SOL' ? 0.65 : 10); // Reset default amount based on token value
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                          >
                            <token.Icon className="w-5 h-5" />
                            <div>
                              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{token.symbol}</div>
                              <div className="text-[10px] text-slate-400">{token.balance}</div>
                            </div>
                            {selectedToken.symbol === token.symbol && (
                              <Icon name="check" className="ml-auto text-blue-500 text-xs" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Increment */}
                <button
                  onClick={() => adjustAmount(selectedToken.symbol === 'SOL' ? 0.01 : 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <Icon name="add" className="text-lg" />
                </button>
              </div>
            </div>

            {/* Quick Suffix Select Buttons */}
            <div className="px-4 pb-2 relative z-20">
              <div className="grid grid-cols-4 gap-2">
                {[0.25, 0.5, 0.75, 1].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAmount(parseFloat((selectedToken.balance * ratio).toFixed(selectedToken.symbol === 'SOL' ? 4 : 2)))}
                    className="py-1.5 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                  >
                    {ratio * 100}%
                  </button>
                ))}
              </div>
            </div>

            {/* Set Target Price */}
            <div className="px-4 pb-3 flex justify-center relative z-10">
              <button className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                <Icon name="tune" className="text-sm" />
                Set Limit Order
              </button>
            </div>

            {/* To Win Section */}
            <div className="mx-4 mb-3 p-4 rounded-xl bg-slate-50 dark:bg-muted/80 border border-border relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">To Win:</span>
                <div className="text-right">
                  <span className={cn(
                    "text-xl font-bold",
                    isYes ? "text-blue-600 dark:text-blue-400" : "text-rose-500 dark:text-rose-400"
                  )}>
                    {profit.toFixed(2)} {selectedToken.symbol}
                  </span>
                  <div className="text-xs font-medium text-green-500 dark:text-green-400">
                    +{profitPercent.toFixed(1)}% Profit
                  </div>
                </div>
              </div>
            </div>

            {/* Buy Button */}
            <div className="px-4 pb-3 relative z-10">
              <button
                onClick={handleBuy}
                disabled={isPending}
                className={cn(
                  "w-full py-3.5 rounded-xl font-bold text-base text-white transition-all transform hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group shadow-lg",
                  isPending ? "opacity-70 cursor-not-allowed bg-slate-500" :
                    isYes
                      ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                      : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
                )}
              >
                <span className="relative z-10">
                  {isPending ? "Waiting for Signature..." : `Sign Order to Buy ${side}`}
                </span>
                {/* Shimmer */}
                {!isPending && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-shimmer" />}
              </button>
            </div>

            {/* Estimated Fee */}
            <div className="px-4 pb-4 text-center relative z-10">
              <span className="text-[10px] text-slate-400 dark:text-slate-600">
                Network Fee ~0.00005 {selectedToken.symbol}
              </span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BetModal;
