export interface MarketsEligibility {
  eligible: boolean;
  reason?: string;
  checkedAt: string;
  region?: string;
}

export interface MarketsCapabilities {
  version: string;
  catalog: boolean;
  trading: boolean;
  combos: boolean;
  intelligence: boolean;
  features?: Record<string, boolean>;
  checkedAt: string;
}

export interface MarketsEventSummary {
  id: string;
  slug?: string;
  title: string;
}

export interface MarketsEventsList {
  events: MarketsEventSummary[];
  cursor: string | null;
  source: string;
  checkedAt: string;
}
