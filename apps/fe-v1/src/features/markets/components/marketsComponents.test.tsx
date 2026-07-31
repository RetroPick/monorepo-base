import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FreshnessBadge } from "../components/FreshnessBadge";
import { DataStateBanner } from "../components/DataState";
import { MarketsApiError } from "@retropick/polymarket";

describe("FreshnessBadge", () => {
  it("renders fresh state", () => {
    render(
      <FreshnessBadge
        freshness={{ state: "fresh", observedAt: "2026-01-01T00:00:00Z", ageMillis: 1000 }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Fresh");
  });
});

describe("DataStateBanner", () => {
  it("shows request id from MarketsApiError", () => {
    render(
      <DataStateBanner
        error={new MarketsApiError("upstream down", { status: 502, code: "upstream", requestId: "req-99" })}
        onRetry={() => undefined}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("req-99");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
