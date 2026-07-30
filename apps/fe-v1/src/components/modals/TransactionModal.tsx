import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '@/components/Icon';
import { cn } from '@/lib/utils';

type TransactionModalProps = {
    isOpen: boolean;
    onClose: () => void;
    type: 'deposit' | 'withdraw';
    onConfirm: (amount: string) => Promise<void>;
    isPending: boolean;
    balance: number;
    symbol: string;
};

export default function TransactionModal({
    isOpen,
    onClose,
    type,
    onConfirm,
    isPending,
    balance,
    symbol
}: TransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [percentage, setPercentage] = useState(0);

    // Handle slider change
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setPercentage(val);
        const calculatedAmount = (balance * val) / 100;
        // format to 6 decimals max, drop trailing zeros
        setAmount(calculatedAmount ? parseFloat(calculatedAmount.toFixed(6)).toString() : '');
    };

    // Sync percentage when amount typed manually
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAmount(val);
        const numVal = Number(val);
        if (balance > 0 && !isNaN(numVal)) {
            const p = (numVal / balance) * 100;
            setPercentage(Math.min(p, 100));
        } else {
            setPercentage(0);
        }
    };

    const setMax = () => {
        setPercentage(100);
        setAmount(balance.toString());
    };

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setPercentage(0);
        }
    }, [isOpen]);

    const title = type === 'deposit' ? 'Deposit to Vault' : 'Withdraw from Vault';
    const desc = type === 'deposit' ? 'Deposit tokens to enable trading.' : 'Withdraw tokens to your wallet.';
    const actionText = type === 'deposit' ? 'Deposit' : 'Withdraw';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={!isPending ? onClose : undefined}
                        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    />

                    {/* Modal Wrapper - ensures perfect centering */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-white/5">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={isPending}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-all"
                                >
                                    <Icon name="close" className="text-sm" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 flex flex-col gap-6">
                                {/* Amount Input */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 font-medium">Amount</span>
                                        <span className="text-slate-500 cursor-pointer hover:text-blue-500 transition-colors" onClick={setMax}>
                                            Balance: {balance.toLocaleString()} {symbol}
                                        </span>
                                    </div>

                                    <div className="relative flex items-center">
                                        <input
                                            type="number"
                                            placeholder="0.0"
                                            value={amount}
                                            onChange={handleAmountChange}
                                            disabled={isPending}
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                        <div className="absolute right-3 flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-400">{symbol}</span>
                                            <button
                                                onClick={setMax}
                                                disabled={isPending}
                                                className="text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-500/20 transition-all"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Slider (Exchange Style) */}
                                <div className="flex flex-col gap-3 py-2">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                                        <span>0%</span>
                                        <span>25%</span>
                                        <span>50%</span>
                                        <span>75%</span>
                                        <span>100%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={percentage}
                                        onChange={handleSliderChange}
                                        disabled={isPending}
                                        className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="p-5 pt-0">
                                <button
                                    onClick={async () => {
                                        if (!amount || Number(amount) <= 0) return;
                                        await onConfirm(amount);
                                        if (!isPending) onClose(); // Assuming onConfirm catches its own errors or we manage state outside.
                                    }}
                                    disabled={isPending || !amount || Number(amount) <= 0 || Number(amount) > balance}
                                    className={cn(
                                        "w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-sm",
                                        isPending || !amount || Number(amount) <= 0 || Number(amount) > balance
                                            ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                    )}
                                >
                                    {isPending ? (
                                        <Icon name="hourglass_empty" className="animate-spin text-sm" />
                                    ) : (
                                        <Icon name={type === 'deposit' ? 'arrow_downward' : 'arrow_upward'} className="text-sm" />
                                    )}
                                    {isPending ? "Processing..." : `${actionText} ${amount || '0'} ${symbol}`}
                                </button>
                            </div>

                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
