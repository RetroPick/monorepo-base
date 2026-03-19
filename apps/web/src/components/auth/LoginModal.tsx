
import { useState } from "react";
import { useAppKit } from '@reown/appkit/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Icon from "@/components/Icon";
import Logo from "@/landing_components/Logo";
import { motion, AnimatePresence } from "framer-motion";

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
    const { open } = useAppKit();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleGoogleLogin = () => {
        if (import.meta.env.DEV) console.log("Google Login clicked");
        // Implement Google Auth logic here
    };

    const handleEmailLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (import.meta.env.DEV) console.log("Email Login:", email, password);
        // Implement Email Auth logic here
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) onClose();
        }}>
            <DialogContent className="sm:max-w-[400px] bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-white/40 dark:border-slate-800/60 shadow-2xl shadow-blue-900/10 dark:shadow-blue-900/20 p-0 overflow-hidden gap-0 transition-colors duration-300">
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
                        {/* Google Login */}
                        <Button
                            variant="outline"
                            className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 h-10 shadow-sm hover:shadow-md transition-all duration-300 group"
                            onClick={handleGoogleLogin}
                        >
                            <svg className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform dark:text-white" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                            </svg>
                            Continue with Google
                        </Button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                                <span className="bg-white/50 dark:bg-slate-950/50 backdrop-blur px-2 text-slate-400 dark:text-slate-500 font-semibold">
                                    Or with email
                                </span>
                            </div>
                        </div>

                        {/* Email/Password Form */}
                        <form onSubmit={handleEmailLogin} className="space-y-3">
                            <div className="space-y-1.5 group">
                                <Label htmlFor="modal-email" className="text-slate-600 dark:text-slate-400 text-[10px] font-bold ml-1 uppercase tracking-wide group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Email</Label>
                                <Input
                                    id="modal-email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all duration-300 h-10 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5 group">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="modal-password" className="text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wide group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">Password</Label>
                                    <span className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer font-medium transition-colors">Forgot?</span>
                                </div>
                                <Input
                                    id="modal-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 transition-all duration-300 h-10 text-sm"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 dark:from-blue-700 dark:to-indigo-700 dark:hover:from-blue-600 dark:hover:to-indigo-600 text-white shadow-lg shadow-blue-600/25 dark:shadow-blue-900/40 h-10 font-semibold tracking-wide transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 text-sm mt-2"
                            >
                                Sign In
                            </Button>
                        </form>

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
