"use client";

import { Button } from "@/shared/components/ui/button";

import { DataStateEmpty } from "../../components/DataState";
import { formatMoneyAmountDisplay } from "../lib/formatCollateral";
import {
  BALANCE_NOT_LINKED_DESCRIPTION,
  BALANCE_NOT_LINKED_TITLE,
  BALANCE_READY_LABEL,
  BALANCE_UPSTREAM_ERROR_DESCRIPTION,
  BALANCE_UPSTREAM_ERROR_TITLE,
} from "../lib/fundingCopy";
import type { CollateralBalanceState } from "../hooks/useMarketsCollateralBalance";
import type { BalancesListResponse } from "../lib/fundingApiClient";

interface FundingBalanceCardProps {
  state: CollateralBalanceState;
  data: BalancesListResponse | null;
  errorMessage: string | null;
  onRetry?: () => void;
}

export function FundingBalanceCard({ state, data, errorMessage, onRetry }: FundingBalanceCardProps) {
  if (state === "idle" || state === "loading") {
    return (
      <section className="rounded-lg border border-border p-4" aria-busy={state === "loading"}>
        <h2 className="text-sm font-medium">{BALANCE_READY_LABEL}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {state === "loading" ? "Loading collateral balance…" : "Link a deposit wallet to view collateral."}
        </p>
      </section>
    );
  }

  if (state === "not_linked") {
    return (
      <DataStateEmpty
        title={BALANCE_NOT_LINKED_TITLE}
        description={BALANCE_NOT_LINKED_DESCRIPTION}
      />
    );
  }

  if (state === "upstream_error") {
    return (
      <div className="space-y-3">
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
          role="alert"
        >
          <p className="font-medium">{BALANCE_UPSTREAM_ERROR_TITLE}</p>
          <p className="mt-1 text-xs opacity-90">{BALANCE_UPSTREAM_ERROR_DESCRIPTION}</p>
          {errorMessage ? <p className="mt-1 text-xs opacity-80">{errorMessage}</p> : null}
        </div>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Retry balance read
          </Button>
        ) : null}
      </div>
    );
  }

  if (state === "unauthorized") {
    return (
      <DataStateEmpty
        title="Session expired"
        description="Sign in with your wallet again to view collateral balance."
      />
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3">
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">Could not load collateral balance</p>
          {errorMessage ? <p className="mt-1 text-xs opacity-80">{errorMessage}</p> : null}
        </div>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium">{BALANCE_READY_LABEL}</h2>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {formatMoneyAmountDisplay(data?.collateral)}
      </p>
      {data?.checkedAt ? (
        <p className="mt-1 text-xs text-muted-foreground">Checked {data.checkedAt}</p>
      ) : null}
    </section>
  );
}
