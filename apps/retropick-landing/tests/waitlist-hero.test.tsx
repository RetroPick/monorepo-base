/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WaitlistHero from "@/components/waitlist/WaitlistHero"

const canvasContext = {
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  clearRect: vi.fn(),
  setTransform: vi.fn(),
}

describe("WaitlistHero", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/")
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

  it("renders the qualified waitlist form without community links inside the hero", () => {
    render(<WaitlistHero />)

    expect(screen.getByRole("heading", { name: "Join the RetroPick Waitlist" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Discord" })).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Telegram" })).not.toBeInTheDocument()
  })

  it("prevents request for invalid email", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
    render(<WaitlistHero />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid-email" },
    })
    fireEvent.click(screen.getByRole("button", { name: /join waitlist/i }))

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled()
    })
    expect(screen.getByRole("status")).toHaveTextContent("Enter a valid email address.")
  })

  it("posts valid submissions with attribution fields to the waitlist API", async () => {
    window.history.replaceState({}, "", "/?utm_source=launch-thread&ref=alpha123")
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true, message: "You’re on the RetroPick waitlist." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    )

    render(<WaitlistHero />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "Person@Example.com" },
    })
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "RetroPick Test" },
    })
    fireEvent.change(screen.getByLabelText("Who are you?"), {
      target: { value: "builder" },
    })
    fireEvent.change(screen.getByLabelText("What do you want RetroPick for?"), {
      target: { value: "prediction_markets" },
    })
    fireEvent.click(screen.getByRole("button", { name: /join waitlist/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /joined/i })).toBeInTheDocument()
    })

    const [, requestInit] = fetchMock.mock.calls[0] ?? []
    const body = JSON.parse(String((requestInit as RequestInit).body)) as Record<string, string>

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/waitlist",
      expect.objectContaining({
        method: "POST",
      })
    )
    expect(body.email).toBe("person@example.com")
    expect(body.name).toBe("RetroPick Test")
    expect(body.role).toBe("builder")
    expect(body.primary_use_case).toBe("prediction_markets")
    expect(body.utm_source).toBe("launch-thread")
    expect(body.referred_by).toBe("alpha123")
    expect(screen.getByRole("status")).toHaveTextContent("You’re on the RetroPick waitlist.")
  })

  it("shows server errors from duplicate signup responses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "You're already on the waitlist." }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    )

    render(<WaitlistHero />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "person@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /join waitlist/i }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("You're already on the waitlist.")
    })
  })
})
