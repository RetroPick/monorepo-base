import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Icon from "./Icon";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  marketTitle: string;
  outcome: string;
  side: 'YES' | 'NO';
  amount: number;
  shares: number;
  potentialWin: number;
  profitPercent: number;
}

const ConfirmationModal = ({
  open,
  onClose,
  marketTitle,
  outcome,
  side,
  amount,
  shares,
  potentialWin,
  profitPercent,
}: ConfirmationModalProps) => {
  const navigate = useNavigate();
  const txId = `#${Math.random().toString(36).substring(2, 6).toUpperCase()}-BTC-${Math.floor(Math.random() * 100)}`;

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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Success Icon */}
            <div className="pt-8 pb-4 flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2, damping: 15, stiffness: 200 }}
                className="size-20 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center ring-8 ring-blue-50/50 dark:ring-blue-900/10 shadow-[0_0_30px_rgba(37,99,235,0.2)]"
              >
                <Icon name="check_circle" className="text-5xl text-blue-600 dark:text-blue-500" filled />
              </motion.div>
            </div>

            <div className="px-6 pb-6 text-center">
              <h2 className="text-2xl font-bold mb-1">Position Confirmed</h2>
              <p className="text-sm text-muted-foreground font-mono">TxID: {txId}</p>
            </div>

            {/* Details */}
            <div className="px-6 pb-6 space-y-4">
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Market</div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{marketTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">You Bought</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{shares.toLocaleString()}</div>
                  <div className={`text-sm font-bold mt-1 ${side === 'YES' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {side}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Total Cost</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">${amount.toFixed(2)}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">USDC</div>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Potential Return</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ${potentialWin.toLocaleString()}
                </div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                  +{profitPercent.toLocaleString()}% ROI
                </div>
              </div>

              {/* Chart */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Probability Curve</div>
                <div className="h-12 relative">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="successGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 35 L10 32 L20 28 L25 30 L30 25 L40 20 L50 22 L60 18 L70 15 L80 12 L100 10"
                      fill="url(#successGradient)"
                    />
                    <path
                      d="M0 35 L10 32 L20 28 L25 30 L30 25 L40 20 L50 22 L60 18 L70 15 L80 12 L100 10"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <circle cx="25" cy="30" r="4" className="fill-white dark:fill-[#0B0B0B]" stroke="#3b82f6" strokeWidth="2">
                      <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <line x1="25" y1="30" x2="25" y2="40" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                  </svg>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono text-left mt-1">Entry @ 0.5¢</div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={() => navigate('/portfolio')}
                className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-colors flex items-center justify-center gap-2"
              >
                View in Portfolio
                <Icon name="arrow_forward" className="text-lg" />
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="share" className="text-lg" />
                Share to X
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmationModal;
