import { motion } from "framer-motion";
import Icon from "@/components/Icon";

interface ClaimSuccessModalProps {
    isOpen: boolean;
    onGoToStatus: () => void;
    onClose: () => void;
}

const ClaimSuccessModal = ({ isOpen, onGoToStatus, onClose }: ClaimSuccessModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0A0A0A] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl"
            >
                <div className="p-8 text-center">
                    {/* Success Icon */}
                    <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                        <Icon name="check" className="text-3xl text-cyan-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Draft Claimed Successfully</h2>
                    <p className="text-gray-400 text-sm mb-8">
                        Your draft has been seeded and is now live on the prediction market.
                    </p>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 rounded-xl overflow-hidden mb-4">
                        <div className="bg-[#111] p-4 text-left">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Draft ID</label>
                            <div className="text-white font-bold flex items-center gap-2">
                                #D-8291 <Icon name="content_copy" className="text-xs text-gray-600" />
                            </div>
                        </div>
                        <div className="bg-[#111] p-4 text-left">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Seed Amount</label>
                            <div className="text-cyan-400 font-bold font-mono">
                                500.00 USDC
                            </div>
                        </div>
                        <div className="bg-[#111] p-4 text-left">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Locked Shares</label>
                            <div className="text-white font-bold">
                                50,000 <span className="text-xs text-gray-500 font-normal">SHARES</span>
                            </div>
                        </div>
                        <div className="bg-[#111] p-4 text-left">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Unlock Date</label>
                            <div className="text-white font-bold flex items-center gap-1">
                                <Icon name="lock" className="text-xs text-gray-500" /> Oct 27, 2024
                            </div>
                        </div>
                    </div>

                    {/* Address Cards */}
                    <div className="space-y-2 mb-8">
                        <div className="bg-[#111] p-3 rounded-lg border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                    <Icon name="account_balance" className="text-sm" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">Liquidity Vault</div>
                                    <div className="text-xs text-gray-300 font-mono">0x71C...92F1</div>
                                </div>
                            </div>
                            <Icon name="content_copy" className="text-xs text-gray-600" />
                        </div>
                        <div className="bg-[#111] p-3 rounded-lg border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                                    <Icon name="person" className="text-sm" />
                                </div>
                                <div className="text-left">
                                    <div className="text-[10px] font-bold text-gray-500 uppercase">Claimer Address</div>
                                    <div className="text-xs text-gray-300 font-mono">0x3A2...B7E9</div>
                                </div>
                            </div>
                            <Icon name="content_copy" className="text-xs text-gray-600" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onGoToStatus}
                            className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            Go to Claim Status <Icon name="arrow_forward" />
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 bg-transparent border border-white/10 hover:bg-white/5 text-white font-bold rounded-xl transition-colors"
                        >
                            Back to Draft Board
                        </button>
                    </div>

                    <div className="mt-6 text-[10px] text-gray-600 font-mono">
                        TRANSACTION CONFIRMED • BLOCK 19283745
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ClaimSuccessModal;
