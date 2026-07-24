import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/context/LanguageContext";
import MarketsAll from "./MarketsAll";

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

describe("MarketsAll", () => {
  it("renders Crypto layout with left nav and market cards", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <MarketsAll />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Crypto" })).toBeInTheDocument();
    expect(screen.getByTestId("discover-layout-crypto")).toBeInTheDocument();
    expect(
      screen.queryByTestId("discover-crypto-nav-mobile") ?? screen.queryByTestId("discover-crypto-nav-desktop"),
    ).toBeTruthy();
    expect(screen.getAllByText("BTC at or above yesterday close by today close").length).toBeGreaterThan(0);
    expect(screen.queryByText("BTC: Today's key level")).not.toBeInTheDocument();
  });

  it("renders Trending layout with featured hero and right rail", () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <MarketsAll initialVertical="trending" />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("discover-layout-trending")).toBeInTheDocument();
    expect(screen.getByTestId("discover-featured-hero")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All markets" })).toBeInTheDocument();
    expect(screen.getByText("Up or Down")).toBeInTheDocument();
  });
});
