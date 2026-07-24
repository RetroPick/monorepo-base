import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useAppKit } from "@reown/appkit/react";
import { usePay } from "@reown/appkit-pay/react";
import { useAccount, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { AlertCircle, Copy, CreditCard, Droplets, Landmark, QrCode, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ABIS, CONTRACT_ADDRESSES } from "@/contracts/config";
import { activeFundingProfile } from "@/config/funding";

type FundWalletDialogProps = {
  address?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function FundWalletDialog({ address, isOpen, onOpenChange }: FundWalletDialogProps) {
  const { open } = useAppKit();
  const { chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitchingNetwork } = useSwitchChain();
  const { toast } = useToast();
  const { open: openExchangeFunding, isPending: isExchangePending } = usePay({
    onError: (error) => {
      toast({
        title: "Exchange deposit unavailable",
        description: error,
        variant: "destructive",
      });
    },
  });

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [selectedAssetId, setSelectedAssetId] = useState(activeFundingProfile.assets[0]?.id ?? "");
  const [amount, setAmount] = useState("100");
  const [isOnRampPending, setIsOnRampPending] = useState(false);
  const { writeContractAsync, data: faucetTxHash, isPending: isFaucetWritePending } = useWriteContract();
  const { isLoading: isFaucetConfirming, isSuccess: isFaucetSuccess } = useWaitForTransactionReceipt({
    hash: faucetTxHash,
  });

  const selectedAsset = useMemo(
    () => activeFundingProfile.assets.find((asset) => asset.id === selectedAssetId) ?? activeFundingProfile.assets[0],
    [selectedAssetId],
  );
  const faucet = activeFundingProfile.faucet;
  const isFundingChain = chainId === activeFundingProfile.chainId;
  const hasFaucet = Boolean(faucet);

  useEffect(() => {
    if (!isOpen || !address) return;

    let cancelled = false;

    void QRCode.toDataURL(address, {
      margin: 1,
      width: 280,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [address, isOpen]);

  useEffect(() => {
    if (!activeFundingProfile.assets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(activeFundingProfile.assets[0]?.id ?? "");
    }
  }, [selectedAssetId, activeFundingProfile.assets]);

  useEffect(() => {
    if (!isFaucetSuccess) return;

    toast({
      title: "Faucet claimed",
      description: `${faucet?.chainLabel ?? activeFundingProfile.chainLabel} test ${faucet?.tokenSymbol ?? "tokens"} were requested successfully.`,
    });
  }, [activeFundingProfile.chainLabel, faucet?.chainLabel, faucet?.tokenSymbol, isFaucetSuccess, toast]);

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: "Address copied",
        description: "Share this wallet address or paste it into your exchange withdrawal flow.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access was blocked. Copy the address manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenOnRamp = async () => {
    setIsOnRampPending(true);

    try {
      await open({ view: "OnRampProviders" });
    } catch (error) {
      toast({
        title: "Buy crypto unavailable",
        description:
          error instanceof Error
            ? error.message
            : "On-ramp providers are not available for the current setup.",
        variant: "destructive",
      });
    } finally {
      setIsOnRampPending(false);
    }
  };

  const handleExchangeDeposit = async () => {
    if (!address) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Enter a deposit amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    await openExchangeFunding({
      choice: "deposit",
      paymentAsset: selectedAsset.asset,
      amount: parsedAmount,
      recipient: address,
      openInNewTab: true,
    });
  };

  const handleFaucetClaim = async () => {
    try {
      if (!faucet) {
        toast({
          title: "Faucet not configured",
          description: `${activeFundingProfile.chainLabel} does not currently expose a faucet in app config.`,
          variant: "destructive",
        });
        return;
      }

      if (!isFundingChain) {
        await switchChainAsync({ chainId: faucet.chainId });
        return;
      }

      await writeContractAsync({
        address: faucet.contractAddress || CONTRACT_ADDRESSES.Faucet,
        abi: ABIS.Faucet,
        functionName: "claim",
        args: [faucet.tokenAddress],
      });
    } catch (error) {
      toast({
        title: "Faucet claim failed",
        description:
          error instanceof Error ? error.message : "Could not request configured faucet funds.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] border-border bg-popover text-popover-foreground">
        <DialogTitle>Fund Wallet</DialogTitle>
        <DialogDescription>
          Receive funds to this wallet, buy crypto through Reown providers, or start a supported
          exchange deposit flow.
        </DialogDescription>

        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <QrCode className="h-4 w-4" />
              Receive QR
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="Wallet receive QR code" className="h-full w-full rounded-lg" />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  QR unavailable
                </div>
              )}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Any EVM wallet or exchange that can withdraw to an address can send funds here.
              </p>
            </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Wallet className="h-4 w-4" />
                Wallet address
              </div>
              <div className="flex gap-2">
                <Input value={address ?? ""} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyAddress}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {hasFaucet ? (
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Droplets className="h-4 w-4" />
                  {faucet?.chainLabel} faucet
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  Claim test {faucet?.tokenSymbol} directly for the configured trading network.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => void handleFaucetClaim()}
                  disabled={isSwitchingNetwork || isFaucetWritePending || isFaucetConfirming}
                >
                  {isSwitchingNetwork
                    ? `Switching to ${faucet?.chainLabel}...`
                    : isFaucetWritePending
                      ? "Confirm faucet claim..."
                      : isFaucetConfirming
                        ? "Claim pending..."
                        : isFundingChain
                          ? `Claim ${faucet?.chainLabel} Test ${faucet?.tokenSymbol}`
                          : `Switch to ${faucet?.chainLabel} for Faucet`}
                </Button>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4" />
                {activeFundingProfile.directFundingLabel}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                {activeFundingProfile.directFundingDescription}
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleOpenOnRamp()}
                disabled={isOnRampPending}
              >
                {isOnRampPending ? "Opening providers..." : activeFundingProfile.cardRailLabel}
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Landmark className="h-4 w-4" />
                Deposit from exchange
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_132px]">
                <div className="space-y-1.5">
                  <Label htmlFor="fund-asset">Funding asset</Label>
                  <Select value={selectedAssetId} onValueChange={(value) => setSelectedAssetId(value as typeof selectedAssetId)}>
                    <SelectTrigger id="fund-asset">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFundingProfile.assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">{selectedAsset.helper}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fund-amount">Amount</Label>
                  <Input
                    id="fund-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                {activeFundingProfile.exchangeDescription}
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full"
                onClick={() => void handleExchangeDeposit()}
                disabled={isExchangePending}
              >
                {isExchangePending ? "Opening exchange deposit..." : "Deposit from Exchange"}
              </Button>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="leading-relaxed text-amber-700 dark:text-amber-200">
                  Funding behavior is driven by app config. Switch
                  <code className="mx-1 rounded bg-amber-500/20 px-1.5 py-0.5">VITE_APP_DEFAULT_NETWORK</code>
                  and
                  <code className="mx-1 rounded bg-amber-500/20 px-1.5 py-0.5">VITE_APP_FUNDING_PROFILE</code>
                  to target different L2s or testnets without changing this component.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
