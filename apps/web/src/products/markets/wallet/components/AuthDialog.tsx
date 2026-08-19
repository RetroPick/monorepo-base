import { useState } from "react";
import { X, Loader2, AlertCircle, ArrowLeft, Check, Smartphone, Download, Sparkles, Mail, ShieldCheck } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useMarketsWalletConnect, type AuthProviderType } from "../hooks/useMarketsWalletConnect";
import { openMarketsAppKitModal } from "../config/appKit";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

type DialogStep = "main" | "google_select" | "email_verify" | "wallet_fallback";

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [step, setStep] = useState<DialogStep>("main");
  const [emailInput, setEmailInput] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [selectedWalletName, setSelectedWalletName] = useState<string>("MetaMask");
  const [selectedWalletIcon, setSelectedWalletIcon] = useState<string>("metamask");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { connectWithConnector } = useMarketsWalletConnect();

  if (!isOpen) return null;

  const resetState = () => {
    setStep("main");
    setEmailInput("");
    setOtpCode(["", "", "", "", "", ""]);
    setIsProcessing(false);
    setStatusMessage(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Google Login Flow
  const startGoogleFlow = () => {
    setErrorMessage(null);
    setStep("google_select");
  };

  const confirmGoogleAccount = async (email: string, name: string) => {
    setIsProcessing(true);
    setStatusMessage(`Signing in as ${name}...`);
    try {
      await new Promise((r) => setTimeout(r, 600));
      await connectWithConnector("google", email);
      setStatusMessage("Google Account Connected!");
      setTimeout(() => {
        handleClose();
      }, 400);
    } catch (e: any) {
      setErrorMessage(e?.message || "Google sign-in failed.");
      setIsProcessing(false);
    }
  };

  // Email Login Flow
  const startEmailFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setErrorMessage(null);
    setStep("email_verify");
  };

  const verifyEmailOtp = async (code: string) => {
    setIsProcessing(true);
    setStatusMessage("Verifying code...");
    try {
      await new Promise((r) => setTimeout(r, 600));
      await connectWithConnector("email", emailInput.trim());
      setStatusMessage("Email Verified!");
      setTimeout(() => {
        handleClose();
      }, 400);
    } catch (e: any) {
      setErrorMessage("Verification failed. Please try again.");
      setIsProcessing(false);
    }
  };

  // Web3 Wallet Flow
  const handleWalletClick = async (walletType: AuthProviderType) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const hasEthereum = typeof window !== "undefined" && Boolean((window as any).ethereum);
    const hasPhantom = typeof window !== "undefined" && Boolean((window as any).phantom?.ethereum || (window as any).ethereum);

    try {
      if (walletType === "walletconnect") {
        setIsProcessing(false);
        handleClose();
        setTimeout(() => {
          openMarketsAppKitModal();
        }, 50);
        return;
      }

      if (walletType === "coinbase") {
        setStatusMessage("Connecting to Coinbase...");
        await connectWithConnector("coinbase");
        handleClose();
        return;
      }

      if (walletType === "metamask") {
        if (hasEthereum) {
          setStatusMessage("Opening MetaMask Extension...");
          await connectWithConnector("metamask");
          handleClose();
          return;
        } else {
          setIsProcessing(false);
          setSelectedWalletName("MetaMask");
          setSelectedWalletIcon("metamask");
          setStep("wallet_fallback");
          return;
        }
      }

      if (walletType === "phantom") {
        if (hasPhantom) {
          setStatusMessage("Opening Phantom Extension...");
          await connectWithConnector("phantom");
          handleClose();
          return;
        } else {
          setIsProcessing(false);
          setSelectedWalletName("Phantom");
          setSelectedWalletIcon("phantom");
          setStep("wallet_fallback");
          return;
        }
      }

      // Default fallback
      await connectWithConnector(walletType);
      handleClose();
    } catch (e: any) {
      console.error(e);
      setIsProcessing(false);
      setStatusMessage(null);
      if (e?.message?.includes("rejected") || e?.code === 4001) {
        setErrorMessage("Connection rejected in wallet.");
      } else {
        setErrorMessage(e?.message || "Wallet connection failed.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fadeIn">
      {/* Modal Dialog Container */}
      <div
        className="relative w-full max-w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0B101D] p-6 shadow-2xl text-white animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Back Button if not on main step */}
        {step !== "main" && (
          <button
            type="button"
            onClick={() => setStep("main")}
            disabled={isProcessing}
            className="absolute left-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer z-10 flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}

        {/* ======================================================== */}
        {/* VIEW 1: MAIN POLYMARKET LOGIN VIEW                       */}
        {/* ======================================================== */}
        {step === "main" && (
          <div>
            {/* Top Link: Continue in view only mode */}
            <div className="text-center pt-1 pb-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="text-sm font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                Continue in view only mode
              </button>
            </div>

            {/* Error Message if any */}
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Big Blue Continue with Google Button */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={startGoogleFlow}
                disabled={isProcessing}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                {/* Google G Icon */}
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* OR Divider */}
              <div className="relative flex items-center justify-center">
                <div className="w-full border-t border-white/[0.08]" />
                <span className="absolute bg-[#0B101D] px-3 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  OR
                </span>
              </div>

              {/* Email Address Input with Integrated Continue Button */}
              <form
                onSubmit={startEmailFlow}
                className="flex items-center rounded-2xl border border-white/10 bg-[#121827] p-1.5 focus-within:border-blue-500/50 transition-all"
              >
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Email address"
                  disabled={isProcessing}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!emailInput.trim() || isProcessing}
                  className={cn(
                    "rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer",
                    emailInput.trim() && !isProcessing
                      ? "bg-blue-600 text-white hover:bg-blue-500 shadow-md"
                      : "bg-white/5 text-slate-500 cursor-not-allowed",
                  )}
                >
                  Continue
                </button>
              </form>

              {/* 4x2 Social & Web3 Wallet Grid (8 Icons) */}
              <div className="grid grid-cols-4 gap-2.5 pt-1">
                {/* 1. Telegram */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("social")}
                  disabled={isProcessing}
                  title="Telegram"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-blue-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white -translate-x-0.5" aria-hidden="true">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </div>
                </button>

                {/* 2. Farcaster */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("social")}
                  disabled={isProcessing}
                  title="Farcaster"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-purple-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#18181B] border border-white/10 text-white shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
                    </svg>
                  </div>
                </button>

                {/* 3. MetaMask */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("metamask")}
                  disabled={isProcessing}
                  title="MetaMask"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-amber-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
                      <path fill="#E17726" d="M28.4 4.5L18.7 11.6 20.5 7.4z" />
                      <path fill="#E27625" d="M3.6 4.5l9.6 7.2L11.5 7.4z" />
                      <path fill="#E27625" d="M24.4 21.6l-2.6 3.9 5.8 1.6 1.7-5.4z" />
                      <path fill="#E27625" d="M7.6 21.6l2.6 3.9-5.8 1.6-1.7-5.4z" />
                      <path fill="#D5BFB2" d="M10.2 25.5l5.8-1.7-5.7-3.9z" />
                      <path fill="#D5BFB2" d="M21.8 25.5l-5.8-1.7 5.7-3.9z" />
                      <path fill="#233447" d="M10.3 19.9l5.7 3.9-5.8 1.7z" />
                      <path fill="#CC6228" d="M16 13.5l3.5 5.5-7 0z" />
                      <path fill="#E27525" d="M16 4.5l-4.5 7.1 4.5 1.9 4.5-1.9z" />
                    </svg>
                  </div>
                </button>

                {/* 4. Brave Wallet */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("injected")}
                  disabled={isProcessing}
                  title="Brave Wallet"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-orange-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/15 text-[#FB542B]">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#FB542B]" aria-hidden="true">
                      <path d="M19.8 8.1c-.2-.6-.6-1.2-1.1-1.6l-5.5-4.1c-.7-.5-1.7-.5-2.4 0L5.3 6.5c-.5.4-.9 1-1.1 1.6-.5 1.5-.7 3.4-.6 5.5 0 2.8 1.1 5.3 3.1 7.2l3.4 3c1.1 1 2.7 1 3.8 0l3.4-3c2-1.9 3.1-4.4 3.1-7.2.1-2.1-.1-4-.6-5.5zm-7.8 8.9c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
                    </svg>
                  </div>
                </button>

                {/* 5. Coinbase Wallet */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("coinbase")}
                  disabled={isProcessing}
                  title="Coinbase Wallet"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-blue-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0052FF] text-white shadow-sm">
                    <div className="h-3.5 w-3.5 rounded-sm bg-white" />
                  </div>
                </button>

                {/* 6. Rabby Wallet */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("injected")}
                  disabled={isProcessing}
                  title="Rabby Wallet"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-indigo-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8697FF] text-white shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
                      <path d="M12 4c-4.4 0-8 3.6-8 8 0 2.4 1 4.5 2.7 6l2.1-1.6c-1.1-1-1.8-2.4-1.8-4.4 0-2.8 2.2-5 5-5s5 2.2 5 5c0 1.2-.4 2.3-1.1 3.2l2.3 1.7C19.1 15.5 20 13.9 20 12c0-4.4-3.6-8-8-8z" />
                    </svg>
                  </div>
                </button>

                {/* 7. Phantom Wallet */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("phantom")}
                  disabled={isProcessing}
                  title="Phantom Wallet"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-purple-500/30 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#AB9FF2] text-slate-900 shadow-sm">
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#2C2D30]" aria-hidden="true">
                      <path d="M18 12c0-3.3-2.7-6-6-6s-6 2.7-6 6c0 1.9.9 3.6 2.3 4.7l1.7-1.7C9.3 14.3 9 13.2 9 12c0-1.7 1.3-3 3-3s3 1.3 3 3c0 1.2-.3 2.3-1 3l1.7 1.7C17.1 15.6 18 13.9 18 12z" />
                    </svg>
                  </div>
                </button>

                {/* 8. More / Other Wallets (QR Code Modal) */}
                <button
                  type="button"
                  onClick={() => handleWalletClick("walletconnect")}
                  disabled={isProcessing}
                  title="Scan QR / More Wallets"
                  className="flex h-14 items-center justify-center rounded-2xl border border-white/5 bg-[#121827] hover:bg-[#1A2338] hover:border-white/20 text-slate-400 hover:text-white transition-all cursor-pointer group shadow-sm"
                >
                  <span className="font-mono text-xl font-bold tracking-widest text-slate-400 group-hover:text-white">
                    ···
                  </span>
                </button>
              </div>
            </div>

            {/* Footer: Terms & Privacy */}
            <div className="mt-5 text-center text-[11px] font-semibold text-slate-500">
              <span className="hover:text-slate-400 cursor-pointer">Terms</span>
              <span className="mx-2">·</span>
              <span className="hover:text-slate-400 cursor-pointer">Privacy</span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: INTERACTIVE GOOGLE SIGN-IN MODAL                 */}
        {/* ======================================================== */}
        {step === "google_select" && (
          <div className="pt-8 pb-2 space-y-4">
            <div className="flex flex-col items-center text-center">
              {/* Google G Logo */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md mb-2">
                <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">Sign in with Google</h3>
              <p className="text-xs text-slate-400">Choose an account to continue to RetroPick</p>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500/10 border border-blue-500/30 p-3 text-xs font-bold text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* List of Available Google Accounts */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => confirmGoogleAccount("fatcur.trader@gmail.com", "Fatcur")}
                disabled={isProcessing}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#121827] hover:bg-[#1A2338] hover:border-blue-500/40 p-3 transition-all cursor-pointer text-left group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 text-sm font-bold text-white shadow-sm">
                  F
                </div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">Fatcur</div>
                  <div className="text-[11px] text-slate-400 truncate">fatcur.trader@gmail.com</div>
                </div>
                <Check className="h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                type="button"
                onClick={() => confirmGoogleAccount("crypto.pro@gmail.com", "Alex Trader")}
                disabled={isProcessing}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#121827] hover:bg-[#1A2338] hover:border-blue-500/40 p-3 transition-all cursor-pointer text-left group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-sm font-bold text-white shadow-sm">
                  A
                </div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">Alex Trader</div>
                  <div className="text-[11px] text-slate-400 truncate">crypto.pro@gmail.com</div>
                </div>
                <Check className="h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>

            <p className="text-[10px] text-center text-slate-500 leading-tight">
              To continue, Google will share your name, email address, and language preference with RetroPick.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: INTERACTIVE EMAIL CODE VERIFICATION              */}
        {/* ======================================================== */}
        {step === "email_verify" && (
          <div className="pt-8 pb-2 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-md mb-2">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">Check your email</h3>
              <p className="text-xs text-slate-400">
                We sent a 6-digit code to <span className="text-white font-semibold">{emailInput}</span>
              </p>
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500/10 border border-blue-500/30 p-3 text-xs font-bold text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2 py-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  type="text"
                  maxLength={1}
                  value={otpCode[index] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newCode = [...otpCode];
                    newCode[index] = val;
                    setOtpCode(newCode);
                    if (val && index < 5) {
                      const nextInput = document.getElementById(`otp-input-${index + 1}`);
                      nextInput?.focus();
                    }
                    if (newCode.every((c) => c !== "")) {
                      verifyEmailOtp(newCode.join(""));
                    }
                  }}
                  id={`otp-input-${index}`}
                  className="h-11 w-10 rounded-xl border border-white/20 bg-[#121827] text-center font-mono text-base font-bold text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              ))}
            </div>

            {/* Autofill & Verify Button */}
            <button
              type="button"
              onClick={() => {
                setOtpCode(["8", "4", "2", "9", "1", "0"]);
                verifyEmailOtp("842910");
              }}
              disabled={isProcessing}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Autofill Code (842910) & Sign In</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: WALLET EXTENSION NOT DETECTED (MOBILE/INSTALL)   */}
        {/* ======================================================== */}
        {step === "wallet_fallback" && (
          <div className="pt-8 pb-2 space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-md mb-2">
                <Smartphone className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-white">{selectedWalletName} Not Detected</h3>
              <p className="text-xs text-slate-400">
                Extension not found in this browser. You can connect using your phone or install the extension.
              </p>
            </div>

            <div className="space-y-2">
              {/* Option 1: Scan QR Code with Mobile App */}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  setTimeout(() => {
                    openMarketsAppKitModal();
                  }, 50);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-600/15 hover:bg-blue-600/25 p-3.5 text-xs font-bold text-white transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div>Scan QR with {selectedWalletName} Mobile</div>
                    <div className="text-[10px] text-blue-300 font-normal">WalletConnect 390+ Wallets</div>
                  </div>
                </div>
                <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>

              {/* Option 2: Instant 1-Click Simulation */}
              <button
                type="button"
                onClick={async () => {
                  await connectWithConnector(selectedWalletIcon as AuthProviderType);
                  handleClose();
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-600/15 hover:bg-emerald-600/25 p-3.5 text-xs font-bold text-white transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <div>Connect with Polygon Trading Account</div>
                    <div className="text-[10px] text-emerald-300 font-normal">Instant Access on Chain 137</div>
                  </div>
                </div>
                <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>

              {/* Option 3: Download Extension */}
              <a
                href={selectedWalletName === "Phantom" ? "https://phantom.app/download" : "https://metamask.io/download/"}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 text-xs font-semibold text-slate-300 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Install {selectedWalletName} Extension</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthDialog;
