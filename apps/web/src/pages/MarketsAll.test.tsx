import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MarketsAll from "./MarketsAll";

vi.mock("@/components/Header", () => ({
  default: () => <div data-testid="header" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

describe("MarketsAll", () => {
  it("renders the discover page without tripping the route boundary", () => {
    render(
      <MemoryRouter>
        <MarketsAll />
      </MemoryRouter>,
    );

    expect(screen.getByText("Up or Down")).toBeInTheDocument();
    expect(screen.getAllByText("View market").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BTC at or above yesterday close by today close").length).toBeGreaterThan(0);
    expect(screen.queryByText("BTC: Today's key level")).not.toBeInTheDocument();
  });
});
