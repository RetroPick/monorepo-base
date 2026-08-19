import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import type { EventSummary } from "@retropick/polymarket";

import { EventCard } from "../components/EventCard";

const sampleEvent: EventSummary = {
  schemaVersion: "1",
  id: "polymarket:event:123",
  upstreamId: "123",
  title: "Sample prediction event",
  status: "open",
  marketCount: 3,
  endAt: "2026-12-31T00:00:00Z",
  freshness: { state: "fresh", observedAt: "2026-07-30T12:00:00Z", ageMillis: 1000 },
  provenance: { source: "polymarket", upstreamId: "123" },
};

describe("EventCard", () => {
  it("links to event detail with Android-parity chrome", () => {
    render(
      <MemoryRouter>
        <EventCard event={sampleEvent} />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link", { name: /sample prediction event/i });
    expect(links[0]).toHaveAttribute("href", "/markets/events/polymarket%3Aevent%3A123");
    expect(screen.getByLabelText("3 markets")).toBeInTheDocument();
  });
});
