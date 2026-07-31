import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { RedirectLegacyEventDetail, RedirectLegacyMarketDetail } from "./MarketsRedirects";

describe("legacy /markets redirects", () => {
  it("redirects ordinary event IDs", async () => {
    render(
      <MemoryRouter initialEntries={["/markets/events/election-2028"]}>
        <Routes>
          <Route path="/markets/events/:eventId" element={<RedirectLegacyEventDetail />} />
          <Route path="/app/events/:eventId" element={<div>event-destination</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("event-destination")).toBeInTheDocument();
  });

  it("redirects polymarket-prefixed market IDs", async () => {
    render(
      <MemoryRouter initialEntries={["/markets/markets/polymarket%3Aabc-123"]}>
        <Routes>
          <Route path="/markets/markets/:marketId" element={<RedirectLegacyMarketDetail />} />
          <Route path="/app/market/:id" element={<div>market-destination</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("market-destination")).toBeInTheDocument();
  });

  it("encodes reserved characters in event IDs", async () => {
    render(
      <MemoryRouter initialEntries={["/markets/events/a%2Fb%3Fc"]}>
        <Routes>
          <Route path="/markets/events/:eventId" element={<RedirectLegacyEventDetail />} />
          <Route path="/app/events/:eventId" element={<div>event-destination</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("event-destination")).toBeInTheDocument();
  });
});
