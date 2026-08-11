import { Link } from "react-router-dom";
import { X } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import {
  DISCOVERY_VERTICALS,
  type DiscoveryVerticalId,
} from "@/shared/lib/discovery-verticals";

import {
  discoverPath,
  fundingPath,
  intelligencePath,
  portfolioPath,
  walletConnectPath,
} from "../../routes/paths";

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
  onCategorySelect?: (id: DiscoveryVerticalId) => void;
}

export function DrawerMenu({ open, onClose, onCategorySelect }: DrawerMenuProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/60 lg:hidden"
        aria-label="Close menu overlay"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 left-0 z-50 flex w-[min(320px,85vw)] flex-col border-r border-border bg-card animate-fade-in lg:hidden"
        aria-label="Navigation drawer"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-display text-sm font-bold">Menu</span>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-secondary/50" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Browse</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link
                to={`${discoverPath()}?tab=explore`}
                onClick={onClose}
                className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary/50"
              >
                Explore
              </Link>
            </li>
            <li>
              <Link
                to={`${discoverPath()}?tab=markets`}
                onClick={onClose}
                className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary/50"
              >
                Markets
              </Link>
            </li>
            <li>
              <Link to={intelligencePath()} onClick={onClose} className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary/50">
                Intelligence
              </Link>
            </li>
            <li>
              <Link to={portfolioPath()} onClick={onClose} className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary/50">
                Portfolio
              </Link>
            </li>
          </ul>

          <p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categories</p>
          <ul className="mt-2 space-y-1">
            {DISCOVERY_VERTICALS.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-secondary/50",
                  )}
                  onClick={() => {
                    onCategorySelect?.(v.id);
                    onClose();
                  }}
                >
                  {v.title}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-6 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account</p>
          <ul className="mt-2 space-y-1">
            <li>
              <Link to={walletConnectPath()} onClick={onClose} className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary/50">
                Wallet
              </Link>
            </li>
            <li>
              <Link to={fundingPath()} onClick={onClose} className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-secondary/50">
                Funding
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
