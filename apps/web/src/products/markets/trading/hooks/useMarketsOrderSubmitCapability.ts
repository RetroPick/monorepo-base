"use client";

import { useMarketsCapabilities } from "../../hooks/useMarketsQueries";

export function useMarketsOrderSubmitCapability() {
  const capabilitiesQuery = useMarketsCapabilities();
  const features = capabilitiesQuery.data?.features as Record<string, boolean> | undefined;
  const orderSubmitEnabled = features?.order_submit === true;

  return {
    orderSubmitEnabled,
    capabilitiesQuery,
  };
}
