import { useQuery } from "@tanstack/react-query";

import {
  fetchMarketsCapabilities,
  fetchMarketsEligibility,
  fetchMarketsEvents,
} from "../api/marketsApi";

export function useMarketsEligibility() {
  return useQuery({
    queryKey: ["markets", "eligibility"],
    queryFn: fetchMarketsEligibility,
    staleTime: 60_000,
  });
}

export function useMarketsCapabilities() {
  return useQuery({
    queryKey: ["markets", "capabilities"],
    queryFn: fetchMarketsCapabilities,
    staleTime: 60_000,
  });
}

export function useMarketsEvents() {
  return useQuery({
    queryKey: ["markets", "events"],
    queryFn: () => fetchMarketsEvents(),
    staleTime: 30_000,
  });
}
