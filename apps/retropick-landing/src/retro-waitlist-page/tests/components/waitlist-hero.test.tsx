/* @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import WaitlistHero from "@/components/waitlist-hero"

describe("WaitlistHero", () => {
  it("shows Discord and Telegram community links", () => {
    render(<WaitlistHero />)
    expect(screen.getByRole("link", { name: "Discord" })).toHaveAttribute("href", "https://discord.gg/5EsnWvcErv")
    expect(screen.getByRole("link", { name: "Telegram" })).toHaveAttribute("href", "https://t.me/RetroPickMarket")
  })

  it("prevents request for invalid email", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
    render(<WaitlistHero />)

    fireEvent.change(screen.getAllByPlaceholderText("Enter your email")[0], {
      target: { value: "invalid-email" },
    })
    fireEvent.click(screen.getAllByRole("button", { name: "Join Waitlist" })[0])

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled()
    })
    fetchMock.mockRestore()
  })

  it("shows joined state after valid submission", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    render(<WaitlistHero />)

    fireEvent.change(screen.getAllByPlaceholderText("Enter your email")[0], {
      target: { value: "person@example.com" },
    })
    fireEvent.click(screen.getAllByRole("button", { name: "Join Waitlist" })[0])

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Joined!" })[0]).toBeInTheDocument()
    })

    expect(fetchMock).toHaveBeenCalled()
    fetchMock.mockRestore()
  })
})
