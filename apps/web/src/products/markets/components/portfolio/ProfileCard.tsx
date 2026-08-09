import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

export type ProfileCardProps = {
  address?: string;
  isConnected: boolean;
  variant?: "default" | "compact";
};

export function ProfileCard({ address, isConnected, variant = "default" }: ProfileCardProps) {
  const handle = isConnected && address ? `User_${address.slice(-6).toUpperCase()}` : "Guest";

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
          </div>
        </div>
        {!isConnected ? (
          <Button type="button" variant="default" className="h-9 w-full text-xs font-semibold">
            Sign Up
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm dark:border-white/[0.08]")}>
      <div className="flex items-start gap-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
          aria-hidden
        >
          {isConnected ? handle.slice(-2) : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{handle}</h2>
        </div>
      </div>
      {!isConnected ? (
        <Button type="button" variant="default" className="mt-4 h-auto w-full py-2.5 text-xs font-semibold">
          Sign Up
        </Button>
      ) : null}
    </div>
  );
}
