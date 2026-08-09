import type { ReactNode } from "react";

interface MarketsReadLayoutProps {
  children: ReactNode;
}

export function MarketsReadLayout({ children }: MarketsReadLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-5 py-4 lg:px-10">
        <p className="text-sm font-semibold tracking-tight">RetroPick Markets</p>
        <p className="text-xs text-muted-foreground">Read-only catalog · trading unavailable</p>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-6 lg:px-10">{children}</main>
    </div>
  );
}
