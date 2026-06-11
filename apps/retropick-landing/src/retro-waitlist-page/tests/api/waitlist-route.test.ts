import { beforeEach, describe, expect, it, vi } from "vitest"

type QueryResult = { data: unknown; error: { code?: string; message?: string } | null }

const state = {
  existingEmail: null as unknown,
  checkError: null as { code?: string; message?: string } | null,
  insertError: null as { code?: string; message?: string } | null,
}

const fetchMock = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async (): Promise<QueryResult> => ({
            data: state.existingEmail,
            error: state.checkError,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(async (): Promise<QueryResult> => ({
          data: [{ id: 42, email: "person@example.com" }],
          error: state.insertError,
        })),
      })),
    })),
  })),
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
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
    state.existingEmail = null
    state.checkError = { code: "PGRST116" }
    state.insertError = null
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role"
    process.env.BREVO_API_KEY = "brevo-api-key"
    process.env.BREVO_SENDER_EMAIL = "sender@example.com"
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ messageId: "<brevo-msg-id-test>" }), { status: 201 })
    )
    vi.stubGlobal("fetch", fetchMock)
  })

  it("returns 500 when required env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "test@example.com" }))

    expect(response.status).toBe(500)
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

  it("returns 409 for duplicate email", async () => {
    state.existingEmail = { email: "person@example.com" }
    state.checkError = null

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))

    expect(response.status).toBe(409)
  })

  it("returns 429 after too many requests from same IP", async () => {
    const POST = await loadRoute()

    let lastStatus = 0
    for (let i = 0; i < 11; i += 1) {
      const response = await POST(
        requestWithBody({ email: `person${i}@example.com` }, { "x-forwarded-for": "1.2.3.4" })
      )
      lastStatus = response.status
    }

    expect(lastStatus).toBe(429)
  })

  it("returns 200 on successful signup and sends via Brevo to signup address", async () => {
    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.emailSent).toBe(true)
    expect(payload.id).toBe("42")
    expect(payload.brevoMessageId).toBe("<brevo-msg-id-test>")
    expect(fetchMock).toHaveBeenCalled()
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("brevo.com"))
    expect(call).toBeDefined()
    const init = call![1] as RequestInit
    expect(init.method).toBe("POST")
    const body = JSON.parse(init.body as string) as {
      sender: { email: string; name: string }
      to: { email: string }[]
      subject: string
      htmlContent: string
      textContent?: string
      replyTo: { email: string; name: string }
      tags: string[]
    }
    expect(body.sender.email).toBe("sender@example.com")
    expect(body.to[0]?.email).toBe("person@example.com")
    expect(body.subject).toBe("RetroPick waitlist confirmation")
    expect(body.htmlContent.length).toBeGreaterThan(500)
    expect(body.textContent && body.textContent.length).toBeGreaterThan(100)
    expect(body.replyTo.email).toBe("sender@example.com")
    expect(body.replyTo.name).toBeTruthy()
    expect(body.tags).toEqual(["transactional", "waitlist"])
  })

  it("uses BREVO_REPLY_TO_EMAIL for replyTo when set", async () => {
    process.env.BREVO_REPLY_TO_EMAIL = "support@example.com"
    process.env.BREVO_REPLY_TO_NAME = "Support"

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    expect(response.status).toBe(200)

    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes("brevo.com"))
    const init = call![1] as RequestInit
    const body = JSON.parse(init.body as string) as { replyTo: { email: string; name: string } }
    expect(body.replyTo.email).toBe("support@example.com")
    expect(body.replyTo.name).toBe("Support")
  })

  it("does not send when sender is a consumer freemail domain", async () => {
    process.env.BREVO_SENDER_EMAIL = "hello@gmail.com"
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(payload.emailSent).toBe(false)
    expect(payload.message).toBe("You're on the waitlist. We could not send the confirmation email this time.")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledWith(
      "[waitlist] Deliverability hard-stop",
      expect.objectContaining({ from: "hello@gmail.com" })
    )
    errorSpy.mockRestore()
  })

  it("returns 200 with emailSent false when Brevo returns an error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 })
    )

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.emailSent).toBe(false)
    expect(payload.message).toBe("You're on the waitlist. We could not send the confirmation email this time.")
    expect(payload.message).not.toContain("BREVO_API_KEY")
    expect(payload.message).not.toContain("BREVO_SENDER_EMAIL")
    expect(payload.emailError).toEqual({
      message: "Invalid API key",
    })
  })

  it("returns 200 with emailSent false when Brevo env is missing", async () => {
    delete process.env.BREVO_API_KEY

    const POST = await loadRoute()
    const response = await POST(requestWithBody({ email: "person@example.com" }))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.emailSent).toBe(false)
    expect(payload.message).toBe("You're on the waitlist. Confirmation email delivery is temporarily unavailable.")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
