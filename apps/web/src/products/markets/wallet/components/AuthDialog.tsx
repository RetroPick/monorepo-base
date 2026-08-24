"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle, Wallet } from "lucide-react";
import { useMarketsWalletConnect } from "../hooks/useMarketsWalletConnect";
import { openMarketsAppKitModal } from "../config/appKit";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-white`} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function AuthDialog({ isOpen, onClose, initialMode = "login" }: AuthDialogProps) {
  const { connectError, connectWithConnector } = useMarketsWalletConnect();
  const [loadingType, setLoadingType] = useState<string | null>(null);

  if (!isOpen) return null;

  const isLogin = initialMode === "login";

  const handleGoogleConnect = async () => {
    setLoadingType("google");
    try {
      onClose();
      await openMarketsAppKitModal();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingType(null);
    }
  };

  const handleWalletConnect = async (type?: "metamask" | "phantom" | "coinbase") => {
    setLoadingType(type || "wallet");
    try {
      if (type && typeof window !== "undefined" && (window as any).ethereum) {
        await connectWithConnector(type);
        onClose();
        return;
      }
      onClose();
      await openMarketsAppKitModal();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B101D] p-6 shadow-2xl text-white animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label={isLogin ? "Log in" : "Sign up"}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          {/* Heading */}
          <div className="pt-1 pb-3 text-center">
            <h2 className="font-display text-lg font-bold text-white">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isLogin
                ? "Log in to access your portfolio and trade."
                : "Sign up to start trading prediction markets."}
            </p>
          </div>

          {/* Error Message if any */}
          {connectError && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="flex-1">{connectError}</span>
            </div>
          )}

          <div className="space-y-3 pt-1">
            {/* 1. Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleConnect}
              disabled={Boolean(loadingType)}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              {loadingType === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              <span>Continue with Google</span>
            </button>

            {/* 2. Connect Wallet / All Web3 Wallets */}
            <button
              type="button"
              onClick={() => handleWalletConnect()}
              disabled={Boolean(loadingType)}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 text-sm font-bold text-white transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
            >
              <Wallet className="h-4 w-4 text-blue-400" />
              <span>Connect Wallet</span>
            </button>

            {/* View Only Mode Link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Continue in view only mode
              </button>
            </div>
          </div>

          {/* Footer: Terms & Privacy */}
          <div className="mt-5 text-center text-[10px] font-semibold text-slate-500 border-t border-white/[0.06] pt-3">
            By connecting, you agree to the <span className="text-slate-400 hover:underline cursor-pointer">Terms of Service</span> and <span className="text-slate-400 hover:underline cursor-pointer">Privacy Policy</span>.
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthDialog;
