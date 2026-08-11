import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, PanelLeft, Wallet } from "lucide-react";

import Logo from "@/shared/components/Logo";
import { cn } from "@/shared/lib/utils";

import { ConnectWalletButton } from "../../wallet/components/ConnectWalletButton";
import { WalletAddressDisclosure } from "../../wallet/components/WalletAddressDisclosure";
import { useMarketsWalletConnect } from "../../wallet/hooks/useMarketsWalletConnect";
import {
  discoverPath,
  fundingPath,
  intelligencePath,
  portfolioPath,
} from "../../routes/paths";
import type { MarketsNavTab } from "./types";

interface MarketsTopBarProps {
  title?: string;
  onMenuOpen?: () => void;
  onAlertsOpen?: () => void;
  activeTab?: MarketsNavTab;
}

const DESKTOP_NAV: { id: MarketsNavTab; label: string; href: string }[] = [
  { id: "explore", label: "Explore", href: `${discoverPath()}?tab=explore` },
  { id: "markets", label: "Markets", href: `${discoverPath()}?tab=markets` },
  { id: "intelligence", label: "Intelligence", href: intelligencePath() },
  { id: "portfolio", label: "Portfolio", href: portfolioPath() },
];

export function MarketsTopBar({ title = "RetroPick", onMenuOpen, onAlertsOpen, activeTab }: MarketsTopBarProps) {
  const { isConnected } = useMarketsWalletConnect();
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/98 text-foreground shadow-sm">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={onMenuOpen}
            className="rounded-md p-1.5 text-foreground transition-colors hover:bg-secondary/40 lg:hidden"
            aria-label="Open menu"
          >
            <PanelLeft className="h-5 w-5" aria-hidden />
          </button>
          <Link to={discoverPath()} className="hidden shrink-0 sm:block">
            <Logo className="h-7 w-auto" />
          </Link>
          <h1 className="truncate font-display text-base font-bold lg:hidden">{title}</h1>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Desktop primary navigation">
            {DESKTOP_NAV.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                  activeTab === item.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={fundingPath()}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              Funding
            </Link>
          </nav>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={() => setWalletOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <WalletAddressDisclosure />
            </button>
          ) : (
            <ConnectWalletButton
              className="h-8 gap-1 rounded-md bg-primary px-3 text-[11px] font-bold text-primary-foreground shadow-sm"
              label={
                <>
                  <Wallet className="h-3.5 w-3.5" aria-hidden />
                  Sign In
                </>
              }
            />
          )}
          <button
            type="button"
            onClick={onAlertsOpen}
            className="relative grid h-8 w-8 place-items-center rounded-md border border-border/60 bg-secondary/50 transition-colors hover:bg-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden />
          </button>
          {walletOpen && isConnected ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30"
                aria-label="Close wallet menu"
                onClick={() => setWalletOpen(false)}
              />
              <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 animate-fade-in rounded-xl border border-border bg-card p-4 shadow-xl">
                <WalletAddressDisclosure />
                <Link
                  to={fundingPath()}
                  className="mt-3 block w-full rounded-md bg-primary py-2 text-center text-[10px] font-bold text-primary-foreground"
                  onClick={() => setWalletOpen(false)}
                >
                  Funding
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
