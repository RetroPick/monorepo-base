/* @vitest-environment jsdom */

import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import Page from "@/app/page"

const canvasContext = {
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  setTransform: vi.fn(),
}

describe("Page", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D)
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the preserved waitlist flow with the source landing sections", () => {
    render(<Page />)

    expect(screen.getByRole("heading", { name: "Join the RetroPick Waitlist" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /join waitlist/i }).length).toBeGreaterThan(0)
    expect(screen.getByText("Event markets with rules you can verify.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "The process" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "The rewards" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Discover Events" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Trading Competitions" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "FAQ" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Brand Kit" })).toBeInTheDocument()
  })
})
