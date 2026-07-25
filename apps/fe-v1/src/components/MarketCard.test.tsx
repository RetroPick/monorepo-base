import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketCard from "./MarketCard";
import type { Market } from "@/types/market";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock("./BetModal", () => ({
  default: () => null,
}));

vi.mock("./Icon", () => ({
  default: () => <span data-testid="icon" />,
}));

function makeMarket(overrides: Partial<Market> = {}): Market {
  return {
    id: "0x" + "a".repeat(64),
    title: "Multi outcome market",
    category: "On-chain",
    icon: "show_chart",
    outcomes: [
      { id: "0", label: "Outcome 1", probability: 25 },
      { id: "1", label: "Outcome 2", probability: 20 },
      { id: "2", label: "Outcome 3", probability: 18 },
      { id: "3", label: "Outcome 4", probability: 15 },
      { id: "4", label: "Outcome 5", probability: 12 },
      { id: "5", label: "Outcome 6", probability: 10 },
    ],
    volume: "300.00",
    totalPool: "300.00",
    status: "open",
    isBinary: false,
    ...overrides,
  };
}

describe("MarketCard", () => {
  it("uses a min-height shell on mobile (grows with outcomes) and the fixed binary-card shell on sm+", () => {
    const { container } = render(<MarketCard market={makeMarket()} variant="discover" />);

    const card = container.querySelector('[role="button"]') as HTMLElement | null;
    expect(card).toBeTruthy();
    /** Mobile: min-h only so phones can grow for long outcome lists without scrollbars. */
    expect(card?.className).toContain("min-h-[200px]");
    /** Desktop (sm+): retain the fixed binary-card shell so cards align in a grid. */
    expect(card?.className).toContain("sm:h-[212px]");
    expect(card?.className).toContain("sm:max-h-[212px]");
    const scroll = screen.getByTestId("market-card-outcomes-scroll");
    expect(scroll.className).toContain("overflow-y-auto");
    expect(scroll.className).toContain("flex-1");
    expect(scroll.className).toContain("basis-0");
  });
});
