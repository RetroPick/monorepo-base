"use client";

import { useQuery } from "@tanstack/react-query";

import { getMarketsClient } from "../../api/marketsClient";
import { useMarketsCapabilities } from "../../hooks/useMarketsQueries";

const ELIGIBILITY_STALE_MS = 60_000;

export function useMarketsWalletGate() {
  const capabilitiesQuery = useMarketsCapabilities();
  const eligibilityQuery = useQuery({
    queryKey: ["markets", "eligibility"],
    queryFn: ({ signal }) => getMarketsClient().getEligibility({ signal }).then((r) => r.data),
    staleTime: ELIGIBILITY_STALE_MS,
    retry: 1,
  });

  const tradingEnabled = Boolean(capabilitiesQuery.data?.trading);
  const catalogEnabled = capabilitiesQuery.data?.catalog !== false;
  const eligible = eligibilityQuery.data?.eligible === true;
  const eligibilityUnknown = eligibilityQuery.isError || eligibilityQuery.data == null;

  return {
    tradingEnabled,
    catalogEnabled,
    eligible,
    eligibilityUnknown,
    eligibilityReason: eligibilityQuery.data?.reason,
    capabilitiesQuery,
    eligibilityQuery,
    canShowTradingCTAs: tradingEnabled && eligible && !eligibilityUnknown,
  };
}
