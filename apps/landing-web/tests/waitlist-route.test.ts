import { beforeEach, describe, expect, it, vi } from "vitest"

const insertMock = vi.fn()
const selectMock = vi.fn()
const singleMock = vi.fn()
const fromMock = vi.fn(() => ({
  insert: (...args: unknown[]) => {
    insertMock(...args)
    return {
      select: (...selectArgs: unknown[]) => {
        selectMock(...selectArgs)
        return {
          single: (...singleArgs: unknown[]) => {
            singleMock(...singleArgs)
            return singleMock.mock.results.at(-1)?.value
          },
        }
      },
    }
  },
}))
const sendWaitlistEmailsMock = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: fromMock,
  })),
}))

vi.mock("@/lib/email", () => ({
  generateReferralCode: vi.fn(() => "generatedref1"),
  sendWaitlistEmails: (...args: unknown[]) => sendWaitlistEmailsMock(...args),
}))

function requestWithBody(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost:3000/api/waitlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  })
}

async function loadRoute() {
  const route = await import("@/app/api/waitlist/route")
  return route.POST
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    singleMock.mockResolvedValue({
      data: {
        id: "row-1",
        email: "person@example.com",
        created_at: "2026-06-11T00:00:00.000Z",
        referral_code: "generatedref1",
      },
      error: null,
    })
    sendWaitlistEmailsMock.mockResolvedValue({
      configured: false,
      adminSent: false,
      confirmationSent: false,
    })
    process.env.WAITLIST_IP_HASH_SALT = "test-salt"
    process.env.WAITLIST_STORAGE_MODE = "retropick_waitlist"
    delete process.env.WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK
  })

  it("returns 400 for invalid JSON body", async () => {
    const POST = await loadRoute()
    const response = await POST(
      new Request("http://localhost:3000/api/waitlist", {
        method: "POST",
        body: "{bad-json",
      })
    )

    expect(response.status).toBe(400)
  })

  it("returns 400 for invalid email", async () => {
    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "bad-email" }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe("Enter a valid email address.")
  })

  it("returns 200 and skips inserts when the honeypot is filled", async () => {
    const POST = await loadRoute()
    const response = await POST(
      requestWithBody({
        email: "person@example.com",
        company_website: "https://spam.test",
      })
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.skipped).toBe(true)
    expect(insertMock).not.toHaveBeenCalled()
    expect(sendWaitlistEmailsMock).not.toHaveBeenCalled()
  })

  it("returns 409 for duplicate email errors", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "retropick_waitlist_email_unique"',
      },
    })

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe("You're already on the waitlist.")
    expect(sendWaitlistEmailsMock).not.toHaveBeenCalled()
  })

  it("returns 429 after too many requests from same IP", async () => {
    const POST = await loadRoute()

    let lastStatus = 0
    for (let i = 0; i < 13; i += 1) {
      const response = await POST(
        requestWithBody({ email: `person${i}@example.com` }, { "x-forwarded-for": "1.2.3.4" })
      )
      lastStatus = response.status
    }

    expect(lastStatus).toBe(429)
  })

  it("inserts normalized submissions into retropick_waitlist and attempts SMTP notification", async () => {
    sendWaitlistEmailsMock.mockResolvedValue({
      configured: true,
      adminSent: true,
      confirmationSent: false,
    })

    const POST = await loadRoute()
    const response = await POST(
      requestWithBody(
        {
          email: " Person@Example.com ",
          name: "  Retro Pick User  ",
          x_handle: "retropickalpha",
          telegram: "@retropicktg",
          role: "builder",
          primary_use_case: "prediction_markets",
          source: "",
          utm_source: "launch-thread",
          utm_medium: "social",
          utm_campaign: "genesis",
          utm_content: "hero",
          utm_term: "event-markets",
          referred_by: "alpha123",
          landing_path: "/?utm_source=launch-thread&ref=alpha123",
        },
        {
          "x-forwarded-for": "9.8.7.6",
          "user-agent": "Vitest Browser",
        }
      )
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.adminEmailSent).toBe(true)
    expect(payload.confirmationEmailSent).toBe(false)
    expect(payload.emailConfigured).toBe(true)
    expect(payload.storageTarget).toBe("retropick_waitlist")
    expect(fromMock).toHaveBeenCalledWith("retropick_waitlist")
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "person@example.com",
        name: "Retro Pick User",
        x_handle: "@retropickalpha",
        telegram: "@retropicktg",
        role: "builder",
        primary_use_case: "prediction_markets",
        source: "launch-thread",
        referred_by: "alpha123",
        landing_path: "/?utm_source=launch-thread&ref=alpha123",
        user_agent: "Vitest Browser",
        ip_hash: expect.stringMatching(/^[a-f0-9]{64}$/),
        referral_code: "generatedref1",
      })
    )
    expect(sendWaitlistEmailsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "person@example.com",
        created_at: "2026-06-11T00:00:00.000Z",
        referral_code: "generatedref1",
      })
    )
  })

  it("returns success when SMTP is not configured but DB insert succeeds", async () => {
    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.emailConfigured).toBe(false)
  })

  it("returns success when SMTP send fails but DB insert succeeds", async () => {
    sendWaitlistEmailsMock.mockResolvedValue({
      configured: true,
      adminSent: false,
      confirmationSent: false,
    })

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.emailConfigured).toBe(true)
    expect(payload.adminEmailSent).toBe(false)
  })

  it("only allows email-only fallback when explicitly enabled", async () => {
    process.env.WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK = "true"
    singleMock.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.retropick_waitlist' in the schema cache",
      },
    })
    sendWaitlistEmailsMock.mockResolvedValue({
      configured: true,
      adminSent: true,
      confirmationSent: false,
    })

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com", source: "manual_test" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.storageTarget).toBe("private_email_fallback")
    expect(payload.degradedStorage).toBe(true)
  })

  it("does not allow email-only fallback when not enabled", async () => {
    singleMock.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST205",
        message: "Could not find the table 'public.retropick_waitlist' in the schema cache",
      },
    })

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com", source: "manual_test" }))
    const payload = await response.json()

    expect(response.status).toBe(500)
    expect(payload.error).toBe("Unable to join the waitlist right now.")
  })
})
