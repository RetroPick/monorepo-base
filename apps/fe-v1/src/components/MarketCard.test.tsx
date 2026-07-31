import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import MarketCard from "@/components/MarketCard";
import type { Market, MarketOutcome } from "@/types/market";

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/BetModal", () => ({ default: () => null }));
vi.mock("@/components/Icon", () => ({ default: () => <span /> }));

function baseMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "polymarket:market:test",
    title: "Test market",
    category: "open",
    icon: "analytics",
    outcomes: [],
    volume: "$1k",
    isBinary: true,
    ...overrides,
  };
}

function outcome(overrides: Partial<MarketOutcome> & Pick<MarketOutcome, "id" | "label">): MarketOutcome {
  return { ...overrides };
}

function renderCard(market: Market) {
  return render(
    <MemoryRouter>
      <MarketCard market={market} variant="discover" />
    </MemoryRouter>,
  );
}

function assertNoInvalidNumbers(container: HTMLElement) {
  expect(container.textContent ?? "").not.toMatch(/NaN|Infinity/);
}

describe("MarketCard probability rendering", () => {
  it("renders both binary outcomes when valid", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probability: 62 }),
          outcome({ id: "no", label: "No", probability: 38 }),
        ],
      }),
    );
    // screen.debug(undefined, 50000);
    expect(container.textContent).toContain("62%");
    expect(container.textContent).toContain("38%");
    expect(container.textContent).toContain("1.61x");
    assertNoInvalidNumbers(container);
  });

  it("renders unavailable for one binary outcome", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probability: 62 }),
          outcome({ id: "no", label: "No", probabilityUnavailable: true }),
        ],
      }),
    );
    expect(container.textContent).toContain("62%");
    expect(container.textContent).toContain("—");
    assertNoInvalidNumbers(container);
  });

  it("renders unavailable for both binary outcomes", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probabilityUnavailable: true }),
          outcome({ id: "no", label: "No", probabilityUnavailable: true }),
        ],
      }),
    );
    expect(container.textContent).toContain("—");
    assertNoInvalidNumbers(container);
  });

  it("renders multi-outcome partial availability", () => {
    const { container } = renderCard(
      baseMarket({
        isBinary: false,
        primitive: "Multi",
        outcomes: [
          outcome({ id: "a", label: "Candidate A", probability: 40 }),
          outcome({ id: "b", label: "Candidate B", probabilityUnavailable: true }),
          outcome({ id: "c", label: "Candidate C", probability: 25 }),
        ],
      }),
    );
    expect(container.textContent).toContain("40%");
    expect(container.textContent).toContain("25%");
    expect(container.textContent).toContain("—");
    assertNoInvalidNumbers(container);
  });

  it("renders range partial availability", () => {
    const { container } = renderCard(
      baseMarket({
        isBinary: false,
        primitive: "Range",
        category: "Range",
        outcomes: [
          outcome({ id: "a", label: "<10", probabilityUnavailable: true }),
          outcome({ id: "b", label: "10-20", probability: 55 }),
        ],
      }),
    );
    expect(container.textContent).toContain("55%");
    expect(container.textContent).toContain("—");
    assertNoInvalidNumbers(container);
  });

  it("renders zero probability without invalid payout multiplier", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probability: 0 }),
          outcome({ id: "no", label: "No", probability: 100 }),
        ],
      }),
    );
    expect(container.textContent).toContain("0%");
    expect(container.textContent).toContain("100%");
    expect(container.textContent).toContain("—");
    assertNoInvalidNumbers(container);
  });

  it("renders 100% probability without invalid payout multiplier", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probability: 100 }),
          outcome({ id: "no", label: "No", probability: 0 }),
        ],
      }),
    );
    expect(container.textContent).toContain("100%");
    assertNoInvalidNumbers(container);
  });

  it("renders malformed upstream decimal as unavailable", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probabilityUnavailable: true }),
          outcome({ id: "no", label: "No", probabilityUnavailable: true }),
        ],
      }),
    );
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
    assertNoInvalidNumbers(container);
  });

  it("does not render payout multipliers for unavailable probability", () => {
    const { container } = renderCard(
      baseMarket({
        outcomes: [
          outcome({ id: "yes", label: "Yes", probabilityUnavailable: true }),
          outcome({ id: "no", label: "No", probabilityUnavailable: true }),
        ],
      }),
    );
    expect(container.textContent).not.toMatch(/\d+\.\d+x/);
    assertNoInvalidNumbers(container);
  });
});
