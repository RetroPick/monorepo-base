import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { executeSocialLogin } from "@reown/appkit-controllers/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import Logo from "@/components/Logo";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { isConnected } = useAccount();
  const { open } = useAppKit();
  const { toast } = useToast();
  const { connectWallet, isPending, pendingConnector, walletOptions } = useWalletConnection();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (isOpen && isConnected) {
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  const handleWalletConnect = async (connector: (typeof walletOptions)[number]["connector"]) => {
    try {
      await connectWallet(connector);
      onClose();
    } catch (error) {
      toast({
        title: "Wallet connection failed",
        description: error instanceof Error ? error.message : "Could not start wallet connection.",
        variant: "destructive",
      });
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);

    try {
      await executeSocialLogin("google");
      onClose();
    } catch (error) {
      toast({
        title: "Google sign-in failed",
        description: error instanceof Error ? error.message : "Google sign-in could not be started.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => !openState && onClose()}>
      <DialogContent className="overflow-hidden border-border/70 bg-background/96 p-0 shadow-2xl sm:max-w-[420px]">
        <DialogTitle className="sr-only">Sign in to RetroPick</DialogTitle>
        <DialogDescription className="sr-only">
          Continue with Google or connect a wallet to start trading on RetroPick.
        </DialogDescription>

        <div className="border-b border-border/60 bg-gradient-to-br from-slate-50 via-background to-cyan-50/60 p-6 dark:from-slate-950 dark:via-background dark:to-cyan-950/30">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl border border-border/60 bg-background/80 p-1.5 shadow-sm">
              <Logo className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Connect to RetroPick</h2>
              <p className="text-sm text-muted-foreground">Use Google for embedded onboarding or connect a wallet directly.</p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center border-border/70 bg-background/85 text-foreground hover:bg-muted"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
          </Button>
        </div>

        <div className="space-y-3 p-6">
          {walletOptions.map(({ connector, label }) => {
            const isConnectorPending = isPending && pendingConnector?.id === connector.id;

            return (
              <Button
                key={`${connector.id}-${label}`}
                type="button"
                variant="outline"
                className="h-11 w-full justify-between border-border/70 bg-background text-foreground hover:bg-muted"
                onClick={() => handleWalletConnect(connector)}
                disabled={isPending}
              >
                <span>{label}</span>
                <span className="text-xs text-muted-foreground">
                  {isConnectorPending ? "Connecting..." : "Wallet"}
                </span>
              </Button>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full text-muted-foreground hover:text-foreground"
            onClick={() => open()}
          >
            More wallet options
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
