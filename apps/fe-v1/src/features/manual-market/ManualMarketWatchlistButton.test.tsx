import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ManualMarketWatchlistButton } from "./ManualMarketWatchlistButton";

describe("ManualMarketWatchlistButton", () => {
  it("renders as a presentational leaf without wallet or query providers", () => {
    const onToggle = vi.fn();

    render(
      <ManualMarketWatchlistButton
        isBookmarked={false}
        busy={false}
        watchlistLoading={false}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByRole("button", { name: "Add to watchlist" });
    expect(button).toBeInTheDocument();
    button.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("shows saved state copy and disables while loading", () => {
    render(
      <ManualMarketWatchlistButton
        isBookmarked
        busy={false}
        watchlistLoading
        onToggle={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Remove from watchlist" })).toBeDisabled();
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
