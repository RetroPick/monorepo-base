"use client";

import { SANDBOX_BANNER_BODY, SANDBOX_BANNER_TITLE } from "../lib/fundingCopy";

export function SandboxFundingBanner() {
  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
      role="status"
    >
      <p className="font-medium">{SANDBOX_BANNER_TITLE}</p>
      <p className="mt-1 text-xs opacity-90">{SANDBOX_BANNER_BODY}</p>
    </div>
  );
}
