import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResolutionPanel } from "../components/ResolutionPanel";
import { sampleResolution } from "../fixtures/openapi-examples";

describe("ResolutionPanel", () => {
  it("renders resolution description and linked sources", () => {
    render(<ResolutionPanel resolution={sampleResolution} />);

    expect(screen.getByRole("heading", { name: /resolution rules/i })).toBeInTheDocument();
    expect(screen.getByText(/resolve yes if a happens/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /resolution sources/i })).toBeInTheDocument();

    const official = screen.getByRole("link", { name: "Official results" });
    expect(official).toHaveAttribute("href", "https://example.com/results");
    expect(official).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByText(/content hash: abc123/i)).toBeInTheDocument();
  });
});
