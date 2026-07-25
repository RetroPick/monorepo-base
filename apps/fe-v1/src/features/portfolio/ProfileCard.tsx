import { Edit2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { openAppKitModal } from "@/lib/openAppKitModal";
import { cn } from "@/lib/utils";

export type ProfileCardProps = {
  address: string | undefined;
  isConnected: boolean;
  /** Dense row for embedding inside Overview card. */
  variant?: "default" | "compact";
};

function shortHandle(addr: string): string {
  const hex = addr.startsWith("0x") ? addr.slice(2) : addr;
  const tail = hex.slice(-6).toUpperCase();
  return `User_${tail}`;
}

export function ProfileCard({ address, isConnected, variant = "default" }: ProfileCardProps) {
  const handle = isConnected && address ? shortHandle(address) : "Guest";

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
            aria-hidden
          >
            {isConnected ? handle.slice(-2) : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{handle}</p>
            {isConnected && address ? (
              <p className="truncate font-mono text-[10px] text-muted-foreground">{`${address.slice(0, 6)}…${address.slice(-4)}`}</p>
            ) : null}
          </div>
        </div>
        {!isConnected ? (
          <Button
            type="button"
            variant="default"
            onClick={() => void openAppKitModal()}
            className="h-9 w-full text-xs font-semibold transition-colors hover:brightness-110"
          >
            Sign Up
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
          aria-hidden
        >
          {isConnected ? handle.slice(-2) : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">{handle}</h2>
            <button
              type="button"
              disabled
              className="rounded-md p-1 text-muted-foreground opacity-40"
              title="Profile editing soon"
              aria-label="Edit display name (soon)"
            >
              <Edit2 className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            disabled
            className={cn(
              "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 py-2.5 text-xs font-semibold text-muted-foreground dark:border-white/[0.1]",
            )}
            aria-disabled
          >
            <span className="text-[11px] font-bold">𝕏</span>
            Link X Account
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 dark:border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Followers</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">0</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 dark:border-white/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Following</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">0</p>
        </div>
      </div>
      {!isConnected ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">Use Sign Up or Sign In in the header, or:</p>
          <Button
            type="button"
            variant="default"
            onClick={() => void openAppKitModal()}
            className="h-auto w-full py-2.5 text-xs font-semibold transition-colors hover:brightness-110"
          >
            Sign Up
          </Button>
        </div>
      ) : null}
    </div>
  );
}
