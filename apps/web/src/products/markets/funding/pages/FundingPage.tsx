"use client";

import { Coins } from "lucide-react";

import { MarketsAppShell } from "../../components/shell/MarketsAppShell";

import { FundingSection } from "../components/FundingSection";
import { FUNDING_PAGE_DESCRIPTION, FUNDING_PAGE_TITLE } from "../lib/fundingCopy";

export function FundingPage() {
  return (
    <MarketsAppShell title="Funding" hideBottomNav>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 text-primary">
            <Coins className="h-6 w-6" aria-hidden />
            <h1 className="font-display text-2xl font-bold">{FUNDING_PAGE_TITLE}</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{FUNDING_PAGE_DESCRIPTION}</p>
        </header>

        <FundingSection />
      </div>
    </MarketsAppShell>
  );
}

export default FundingPage;
