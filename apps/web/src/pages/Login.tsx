import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useSwitchChain, useSignTypedData, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

// Mocks for local testing - these would be replaced by actual contract ABIs and addresses
const TEST_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with real ERC20 Fuji address
const SETTLEMENT_VAULT_ADDRESS = "0x0000000000000000000000000000000000000000"; // Replace with real ChannelSettlement/Vault address
const TEST_SESSION_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

const ERC20_ABI = [
    {
        constant: false,
        inputs: [
            { name: "_spender", type: "address" },
            { name: "_value", type: "uint256" }
        ],
        name: "approve",
        outputs: [{ name: "", type: "bool" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
    }
];
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
// Dialog imports removed as we use native AppKit modal
import Icon from "@/components/Icon";
import Logo from "@/landing_components/Logo";
import { IDKitWidget, VerificationLevel, ISuccessResult } from '@worldcoin/idkit';
import { useToast } from "@/components/ui/use-toast";
import { useAppKit } from "@reown/appkit/react";

const Login = () => {
    const { isConnected, address, chain } = useAccount();
    const { open: openAppKit } = useAppKit();
    const { switchChain } = useSwitchChain();
    const fujiChainId = 43113; // Avalanche Fuji Testnet
    const navigate = useNavigate();
    const { toast } = useToast();
    const [isVerified, setIsVerified] = useState(false);
    const [isTradingEnabled, setIsTradingEnabled] = useState(false);

    const { signTypedDataAsync } = useSignTypedData();
    const { writeContractAsync: approveAsync, data: approveTxHash } = useWriteContract();
    const { isLoading: isApproving, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

    // If they are connected on exactly Fuji, and verified, push to app
    useEffect(() => {
        if (isConnected && chain?.id === fujiChainId && isVerified && isTradingEnabled) {
            navigate("/app");
        }
    }, [isConnected, chain?.id, isVerified, isTradingEnabled, navigate]);

    useEffect(() => {
        if (isApproveSuccess) {
            setIsTradingEnabled(true);
            toast({ title: "Trading Enabled!", description: "You are ready to trade on RetroPick." });
        }
    }, [isApproveSuccess, toast]);

    // Removed old isConnected effect for isConnectOpen

    const handleVerify = async (proof: ISuccessResult) => {
        // In a real app, send proof to backend relayer to verify on-chain or off-chain
        if (import.meta.env.DEV) console.log("Proof received:", proof);
        toast({
            title: "World ID Verified!",
            description: "You have been authenticated as a unique human.",
        });
    };

    const handleEnableTrading = async () => {
        try {
            if (!address) throw new Error("Wallet not connected");

            // 1. Sign Session
            const domain = {
                name: "ShadowPool",
                version: "1",
                chainId: 43113, // Fuji
                verifyingContract: SETTLEMENT_VAULT_ADDRESS as `0x${string}`,
            } as const;

            const types = {
                SessionSignIn: [
                    { name: "sessionId", type: "bytes32" },
                    { name: "user", type: "address" },
                ],
            } as const;

            const message = {
                sessionId: TEST_SESSION_ID,
                user: address as `0x${string}`,
            } as const;

            const signature = await signTypedDataAsync({ domain, types, primaryType: "SessionSignIn", message } as any);
            if (import.meta.env.DEV) console.log("Derived Session Signature:", signature);
            toast({ title: "Session Signed", description: "You have securely entered the Yellow Session off-chain." });

            // 2. Approve Token
            await approveAsync({
                address: TEST_TOKEN_ADDRESS as `0x${string}`,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [SETTLEMENT_VAULT_ADDRESS, 2n ** 256n - 1n], // Max uint256
                account: address,
                chain: undefined,
            } as any);

        } catch (error: any) {
            console.error(error);
            toast({ title: "Setup Failed", description: error.message, variant: "destructive" });
        }
    };

    const onSuccess = () => {
        setIsVerified(true);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4">
            {/* Animated Background Effects */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 pointer-events-none"
            >
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 blur-[100px] rounded-full mix-blend-multiply filter opacity-70 animate-blob" />
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-400/20 blur-[100px] rounded-full mix-blend-multiply filter opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-400/20 blur-[100px] rounded-full mix-blend-multiply filter opacity-70 animate-blob animation-delay-4000" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="bg-white/70 backdrop-blur-xl border-white/50 shadow-2xl shadow-blue-500/10 overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>

                    <CardHeader className="text-center space-y-2 pb-6 pt-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="mx-auto mb-2 relative group"
                        >
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative bg-white rounded-2xl p-1 shadow-xl">
                                <Logo className="w-16 h-16 rounded-xl" />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
                                Enter RetroPick
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                Complete verification to trade instantly
                            </CardDescription>
                        </motion.div>
                    </CardHeader>

                    <CardContent className="space-y-4 px-8 pb-8">

                        {/* 1. Wallet Connection */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Button
                                onClick={() => openAppKit()}
                                variant="outline"
                                className="w-full border-2 border-dashed border-blue-200 bg-blue-50/30 text-blue-600 hover:bg-blue-50/80 hover:border-blue-300 h-14 font-medium transition-all hover:scale-[1.01]"
                            >
                                <Icon name={isConnected ? "check_circle" : "account_balance_wallet"} className="mr-2 text-xl" />
                                {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : "1. Connect Web3 Wallet"}
                            </Button>
                        </motion.div>

                        {/* 2. Add / Switch Network (Only shows if wrong network) */}
                        {isConnected && chain?.id !== fujiChainId && (
                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.45 }}
                            >
                                <Button
                                    onClick={() => switchChain({ chainId: fujiChainId })}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 h-14 font-semibold tracking-wide transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95"
                                >
                                    <Icon name="swap_horiz" className="mr-2 text-xl" />
                                    2. Switch to Avalanche Fuji
                                </Button>
                                <p className="text-xs text-center text-slate-400 mt-2">RetroPick runs on Avalanche Fuji Testnet.</p>
                            </motion.div>
                        )}

                        {/* 3. World ID Verification */}
                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            <IDKitWidget
                                app_id="app_dummy_staging_id" // Replace with real World ID app_id
                                action="login" // Action name configured in Worldcoin Developer Portal
                                verification_level={VerificationLevel.Device}
                                handleVerify={handleVerify}
                                onSuccess={onSuccess}
                            >
                                {({ open }) => (
                                    <Button
                                        onClick={open}
                                        disabled={!isConnected || chain?.id !== fujiChainId || isVerified}
                                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 h-14 font-semibold tracking-wide transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                    >
                                        <Icon name={isVerified ? "verified_user" : "fingerprint"} className="mr-2 text-xl" />
                                        {isVerified ? "ID Verified" : (chain?.id !== fujiChainId ? "Verify with World ID (Network Req)" : "Verify with World ID")}
                                    </Button>
                                )}
                            </IDKitWidget>

                            {!isConnected && (
                                <p className="text-xs text-center text-slate-400 mt-2">Connect wallet first to enable verification.</p>
                            )}
                        </motion.div>

                        {/* 4. Enable Trading */}
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Button
                                onClick={handleEnableTrading}
                                disabled={!isVerified || isTradingEnabled || isApproving}
                                className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg shadow-purple-500/25 h-14 font-semibold tracking-wide transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                <Icon name={isTradingEnabled ? "check_circle" : "security"} className="mr-2 text-xl" />
                                {isTradingEnabled ? "Trading Enabled" : (isApproving ? "Confirming..." : "Enable Trading Onchain")}
                            </Button>
                            {!isVerified && (
                                <p className="text-xs text-center text-slate-400 mt-2">Verify identity first to enable trading.</p>
                            )}
                        </motion.div>

                    </CardContent>

                    <CardFooter className="flex flex-col space-y-2 text-center text-sm text-slate-500 pb-8 bg-slate-50/50 border-t border-slate-100 pt-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            Powered by <span className="font-bold text-slate-700">Worldcoin</span> & <span className="font-bold text-slate-700">Chainlink CRE</span>
                        </motion.div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default Login;
