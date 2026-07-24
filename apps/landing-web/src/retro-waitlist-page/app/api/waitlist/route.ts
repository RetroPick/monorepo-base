import * as React from "react"
import { render } from "@react-email/render"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { WaitlistWelcomeEmail, waitlistWelcomeSubject } from "@/emails/WaitlistWelcome"

/** Reject near-empty HTML so we never report success for a broken render. */
const MIN_WAITLIST_EMAIL_HTML_LENGTH = 2000

/** https://developers.brevo.com/reference/sendtransacemail */
const BREVO_SMTP_API = "https://api.brevo.com/v3/smtp/email"

export const runtime = "nodejs"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS_PER_IP = 10
const MAX_REQUESTS_PER_EMAIL = 3

type RateEntry = {
  count: number
  resetAt: number
}

const ipRateLimiter = new Map<string, RateEntry>()
const emailRateLimiter = new Map<string, RateEntry>()

function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "unknown"
  const visible = local.length <= 2 ? local : `${local.slice(0, 2)}***`
  return `${visible}@${domain}`
}

function getRequiredEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRole) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Server configuration error" }, { status: 500 }),
    }
  }

  return {
    ok: true as const,
    supabaseUrl,
    supabaseServiceRole,
  }
}

async function parsePayload(request: Request) {
  try {
    const body = await request.json()
    return { ok: true as const, body }
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }),
    }
  }
}

function checkRateLimit(store: Map<string, RateEntry>, key: string, limit: number) {
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count += 1
  store.set(key, current)
  return true
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown"
  }

  return request.headers.get("x-real-ip") || "unknown"
}

type EmailSendErrShape = { message: string }

function userFacingEmailFailureMessage(err: EmailSendErrShape, fromAddress: string): string {
  const detail = err.message.trim()
  console.error("[waitlist] Confirmation email delivery detail", { message: detail, fromAddress })
  return "You're on the waitlist. We could not send the confirmation email this time."
}

type BrevoErrorJson = { message?: string; code?: string }
type BrevoSuccessJson = { messageId?: string }

/** Consumer freemail as From via any ESP often fails DMARC alignment → spam. Prefer a domain you verify in Brevo. */
function isConsumerFreemailDomain(email: string): boolean {
  return /@(gmail|googlemail|yahoo|ymail|rocketmail|hotmail|outlook|live|msn|icloud|me\.com|mac\.com|protonmail|proton\.me|pm\.me)\./i.test(
    email.trim()
  )
}

async function sendTransactionalEmailViaBrevo(params: {
  apiKey: string
  senderEmail: string
  senderName: string
  toEmail: string
  subject: string
  htmlContent: string
  textContent?: string
  replyToEmail: string
  replyToName: string
}): Promise<{ messageId?: string }> {
  const body: Record<string, unknown> = {
    sender: { name: params.senderName, email: params.senderEmail },
    to: [{ email: params.toEmail }],
    subject: params.subject,
    htmlContent: params.htmlContent,
    replyTo: { email: params.replyToEmail, name: params.replyToName },
    tags: ["transactional", "waitlist"],
  }
  const plain = params.textContent?.trim()
  if (plain && plain.length > 0) {
    body.textContent = plain
  }

  const res = await fetch(BREVO_SMTP_API, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": params.apiKey,
    },
    body: JSON.stringify(body),
  })

  if (res.ok) {
    try {
      const ok = (await res.json()) as BrevoSuccessJson
      const messageId = typeof ok.messageId === "string" ? ok.messageId : undefined
      return { messageId }
    } catch {
      return {}
    }
  }

  let detail = res.statusText || `HTTP ${res.status}`
  try {
    const errJson = (await res.json()) as BrevoErrorJson
    if (typeof errJson.message === "string" && errJson.message) {
      detail = errJson.message
    }
  } catch {
    // ignore JSON parse errors
  }
  throw new Error(detail)
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    if (!checkRateLimit(ipRateLimiter, clientIp, MAX_REQUESTS_PER_IP)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    const env = getRequiredEnv()
    if (!env.ok) {
      console.error("[waitlist] Missing required Supabase environment variables")
      return env.response
    }

    const parsed = await parsePayload(request)
    if (!parsed.ok) {
      return parsed.response
    }

    const { email, source } = parsed.body
    if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (!checkRateLimit(emailRateLimiter, normalizedEmail, MAX_REQUESTS_PER_EMAIL)) {
      return NextResponse.json({ error: "Too many attempts for this email. Please try later." }, { status: 429 })
    }

    const supabase = createClient(env.supabaseUrl, env.supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: existingEmail, error: checkError } = await supabase
      .from("waitlist_signups")
      .select("email")
      .eq("email", normalizedEmail)
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { error: "This email is already on the waitlist" },
        { status: 409 }
      )
    }

    if (checkError && checkError.code !== "PGRST116") {
      console.error("[waitlist] Database check error", { code: checkError.code, message: checkError.message })
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    const { data: insertData, error: insertError } = await supabase
      .from("waitlist_signups")
      .insert([
        {
          email: normalizedEmail,
          source: source || "landing",
        },
      ])
      .select()

    if (insertError) {
      console.error("[waitlist] Insert error", { code: insertError.code, message: insertError.message })
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This email is already on the waitlist" },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
    }

    const insertedRow = Array.isArray(insertData) ? insertData[0] : null
    const signupId =
      insertedRow &&
      typeof insertedRow === "object" &&
      insertedRow !== null &&
      "id" in insertedRow &&
      (insertedRow as { id: unknown }).id != null
        ? String((insertedRow as { id: unknown }).id)
        : undefined

    let emailSent = false
    let emailSendError: EmailSendErrShape | undefined
    let brevoMessageId: string | undefined

    const brevoApiKey = process.env.BREVO_API_KEY?.trim()
    const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim()
    const brevoSenderName = (process.env.BREVO_SENDER_NAME || "RetroPick").trim() || "RetroPick"

    if (!brevoApiKey || !brevoSenderEmail) {
      console.warn("[waitlist] BREVO_API_KEY or BREVO_SENDER_EMAIL not set; skipping confirmation email")
    } else {
      if (isConsumerFreemailDomain(brevoSenderEmail)) {
        const msg =
          "BREVO_SENDER_EMAIL uses a consumer mailbox domain. Use a verified sender on your own domain for inbox placement."
        emailSendError = { message: msg }
        console.error("[waitlist] Deliverability hard-stop", {
          from: brevoSenderEmail,
          reason: msg,
        })
      } else {
        try {
          const emailEl = React.createElement(WaitlistWelcomeEmail, { email: normalizedEmail })
          const html = await render(emailEl)
          let textContent: string | undefined
          try {
            textContent = await render(emailEl, { plainText: true })
          } catch {
            textContent = undefined
          }

          if (html.length < MIN_WAITLIST_EMAIL_HTML_LENGTH) {
            emailSendError = {
              message: `Email HTML render was too short (${html.length} chars). Fix the React Email template.`,
            }
            console.error("[waitlist] Email render sanity check failed", {
              email: maskEmail(normalizedEmail),
              htmlLength: html.length,
            })
          } else {
            const replyToEmail = process.env.BREVO_REPLY_TO_EMAIL?.trim() || brevoSenderEmail
            const replyToName = (process.env.BREVO_REPLY_TO_NAME || brevoSenderName).trim() || brevoSenderName
            const sent = await sendTransactionalEmailViaBrevo({
              apiKey: brevoApiKey,
              senderEmail: brevoSenderEmail,
              senderName: brevoSenderName,
              toEmail: normalizedEmail,
              subject: waitlistWelcomeSubject,
              htmlContent: html,
              textContent,
              replyToEmail,
              replyToName,
            })
            brevoMessageId = sent.messageId
            emailSent = true
            console.log("[waitlist] Confirmation email accepted by Brevo API", {
              to: maskEmail(normalizedEmail),
              htmlLength: html.length,
              messageId: brevoMessageId,
            })
          }
        } catch (emailError) {
          const msg = emailError instanceof Error ? emailError.message : String(emailError)
          emailSendError = { message: msg }
          console.error("[waitlist] Brevo send failed", {
            to: maskEmail(normalizedEmail),
            message: msg,
          })
        }
      }
    }

    const message = emailSent
      ? "Successfully joined waitlist. Please check your inbox for confirmation."
      : !brevoApiKey || !brevoSenderEmail
        ? "You're on the waitlist. Confirmation email delivery is temporarily unavailable."
        : emailSendError
          ? userFacingEmailFailureMessage(emailSendError, brevoSenderEmail)
          : "You're on the waitlist. Confirmation email could not be sent right now."

    return NextResponse.json(
      {
        success: true,
        message,
        emailSent,
        ...(signupId !== undefined ? { id: signupId } : {}),
        ...(emailSent && brevoMessageId ? { brevoMessageId } : {}),
        ...(emailSendError && !emailSent ? { emailError: emailSendError } : {}),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[waitlist] Unhandled waitlist error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
