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

    expect(screen.getByRole("heading", { name: "Markets" })).toBeInTheDocument();
    expect(screen.getByText(/Browse live threshold markets/i)).toBeInTheDocument();
    expect(screen.getByText("Most volume")).toBeInTheDocument();
  });
});
