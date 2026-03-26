
import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { executeSocialLogin } from '@reown/appkit-controllers/utils';
import { Button } from "@/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
    const { open } = useAppKit();
    const { isConnected } = useAppKitAccount();
    const { toast } = useToast();
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    useEffect(() => {
        if (isOpen && isConnected) {
            onClose();
        }
    }, [isConnected, isOpen, onClose]);

    const handleGoogleLogin = async () => {
        setIsGoogleLoading(true);

        try {
            await executeSocialLogin('google');
        } catch (error) {
            const description = error instanceof Error ? error.message : 'Google sign-in could not be started.';

            toast({
                title: 'Google sign-in failed',
                description,
                variant: 'destructive'
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="sm:max-w-[400px] bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-white/40 dark:border-slate-800/60 shadow-2xl shadow-blue-900/10 dark:shadow-blue-900/20 p-0 overflow-hidden gap-0 transition-colors duration-300">
                <DialogTitle className="sr-only">Sign in to RetroPick</DialogTitle>
                <DialogDescription className="sr-only">
                    Continue with Google to create an embedded smart account, or open the wallet connection modal.
                </DialogDescription>
                {/* Decorative Top Gradient */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 z-10"></div>

                {/* Background Blobs for Modal */}
                <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-blue-400/10 dark:bg-blue-500/10 blur-[40px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-indigo-400/10 dark:bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none" />

                <div className="p-6 pt-8 relative z-10">
                    <CardHeader className="text-center space-y-2 p-0 pb-6">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                            className="mx-auto mb-2"
                        >
                            <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-lg shadow-blue-500/10 dark:shadow-blue-500/20 border border-transparent dark:border-slate-800">
                                <Logo className="w-12 h-12 rounded-xl" />
                            </div>
                        </motion.div>

                        <CardTitle className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                            Welcome Back
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
                            Sign in to access your dashboard
                        </CardDescription>
                    </CardHeader>

                    <div className="space-y-4">
                        <Button
                            variant="outline"
                            className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 h-10 shadow-sm hover:shadow-md transition-all duration-300 group"
                            onClick={handleGoogleLogin}
                            disabled={isGoogleLoading}
                        >
                            <svg className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform dark:text-white" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            {isGoogleLoading ? 'Opening Google...' : 'Continue with Google'}
                        </Button>

                        <div className="pt-2">
                            <Button
                                variant="outline"
                                className="w-full border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 h-11 font-medium transition-all hover:scale-[1.01] text-sm"
                                onClick={() => open()}
                            >
                                <Icon name="wallet" className="mr-2 text-base" />
                                Connect Web3 Wallet
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Don't have an account? <span className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer font-bold transition-colors">Create account</span>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default LoginModal;
