import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/Icon";

interface ClaimSeedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const steps = ["Review", "Approve", "Sign", "Submit"];

const ClaimSeedModal = ({ isOpen, onClose, onSuccess }: ClaimSeedModalProps) => {
    const [currentStep, setCurrentStep] = useState(2); // Start at Approve for demo as per screenshot
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApprove = () => {
        setIsProcessing(true);
        // Simulate transaction delay
        setTimeout(() => {
            setIsProcessing(false);
            setCurrentStep(3); // Go to Sign
            setTimeout(() => {
                setCurrentStep(4); // Go to Submit
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }, 1000);
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#1A1D24] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10 text-white"
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/10">
                    <h3 className="text-lg font-bold">Claim & Seed Market</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <Icon name="close" />
                    </button>
                </div>

                {/* Stepper */}
                <div className="px-8 py-6">
                    <div className="flex items-center justify-between relative">
                        {/* Progress Line */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-700 -z-10" />

                        {steps.map((step, index) => {
                            const stepNum = index + 1;
                            const isActive = stepNum === currentStep;
                            const isCompleted = stepNum < currentStep;

                            return (
                                <div key={step} className="flex flex-col items-center gap-2 bg-[#1A1D24] px-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${isActive ? "bg-blue-600 border-blue-600 text-white" :
                                            isCompleted ? "bg-green-500 border-green-500 text-black" :
                                                "bg-gray-800 border-gray-600 text-gray-400"
                                        }`}>
                                        {isCompleted ? <Icon name="check" className="text-xs" /> : stepNum}
                                    </div>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? "text-blue-500" :
                                            isCompleted ? "text-green-500" :
                                                "text-gray-600"
                                        }`}>{step}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Content - Step 2: Approve */}
                <div className="p-6 pt-0 text-center">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Icon name="account_balance_wallet" className="text-2xl" />
                    </div>

                    <h2 className="text-xl font-bold mb-2">Approve USDC Spending</h2>
                    <p className="text-gray-400 text-sm mb-8">Allow the RetroPick Exchange contract to spend your USDC.</p>

                    {/* Token Card */}
                    <div className="bg-[#111318] border border-white/10 rounded-xl p-4 flex items-center justify-between mb-8 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">U</div>
                            <div>
                                <div className="font-bold text-white">USDC Coin</div>
                                <div className="text-xs text-gray-400">Balance: 2,450.00</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-white font-mono">500.00</div>
                            <div className="text-xs text-gray-400">~$500.00</div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                        <span>Network Cost</span>
                        <span>~$1.25 (0.0004 ETH)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400 mb-8">
                        <span>Contract</span>
                        <span className="font-mono text-blue-400">0xExchange...8f2a</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-transparent border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Icon name="progress_activity" className="animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                "Approve Token"
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ClaimSeedModal;
