export type EquivalenceScope = "template" | "feed" | "asset" | "market";

export type EquivalenceKey = {
  scope: EquivalenceScope;
  value: string;
};

export type EquivalenceDecision = {
  equivalent: boolean;
  reason: string;
};

export function normalizeEquivalenceValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function compareEquivalenceKeys(left: EquivalenceKey, right: EquivalenceKey): EquivalenceDecision {
  if (left.scope !== right.scope) {
    return { equivalent: false, reason: "different scopes" };
  }
  const l = normalizeEquivalenceValue(left.value);
  const r = normalizeEquivalenceValue(right.value);
  return l === r
    ? { equivalent: true, reason: "normalized values match" }
    : { equivalent: false, reason: "normalized values differ" };
}
