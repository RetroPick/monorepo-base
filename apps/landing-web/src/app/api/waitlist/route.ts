import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { generateReferralCode, sendWaitlistEmails } from "@/lib/email"
import { parseWaitlistPayload, type WaitlistInsertRecord } from "@/lib/waitlist"

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS_PER_IP = 12
const MAX_REQUESTS_PER_EMAIL = 4
const DUPLICATE_WAITLIST_MESSAGE = "You're already on the waitlist."
const SUCCESS_WAITLIST_MESSAGE = "You’re on the RetroPick waitlist. We’ll contact you from rudeus33@retropick.xyz."
const WAITLIST_TABLE = "retropick_waitlist"

export const runtime = "nodejs"

type RateEntry = {
  count: number
  resetAt: number
}

type InsertErrorShape = {
  code?: string | null
  message?: string | null
}

type InsertedWaitlistRow = {
  id?: string | null
  email?: string | null
  created_at?: string | null
  referral_code?: string | null
}

const ipRateLimiter = new Map<string, RateEntry>()
const emailRateLimiter = new Map<string, RateEntry>()

function parseBody(request: Request) {
  return request.json() as Promise<unknown>
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

function hashIp(ip: string) {
  const salt = process.env.WAITLIST_IP_HASH_SALT?.trim()
  if (!salt || !ip || ip === "unknown") return null
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex")
}

function isDuplicateError(code?: string | null, message?: string | null) {
  if (code === "23505") return true
  return typeof message === "string" && message.toLowerCase().includes("duplicate")
}

function isSchemaFailure(error: InsertErrorShape | null | undefined) {
  if (!error?.message) return false
  return (
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    error.message.toLowerCase().includes("schema cache") ||
    error.message.toLowerCase().includes("could not find the table") ||
    error.message.toLowerCase().includes("could not find the")
  )
}

function shouldAllowEmailOnlyFallback() {
  return process.env.WAITLIST_ALLOW_EMAIL_ONLY_FALLBACK === "true"
}

function getStorageMode() {
  return process.env.WAITLIST_STORAGE_MODE?.trim() || WAITLIST_TABLE
}

function buildInsertRecord(data: WaitlistInsertRecord) {
  return {
    ...data,
    referral_code: data.referral_code || generateReferralCode(),
  }
}

async function insertWaitlistRecord(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: WaitlistInsertRecord
) {
  const insertPayload = buildInsertRecord(data)
  const result = await supabase
    .from(getStorageMode())
    .insert(insertPayload)
    .select("id,email,created_at,referral_code")
    .single()

  return {
    payload: insertPayload,
    data: (result.data || null) as InsertedWaitlistRow | null,
    error: (result.error || null) as InsertErrorShape | null,
  }
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    if (!checkRateLimit(ipRateLimiter, clientIp, MAX_REQUESTS_PER_IP)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 })
    }

    let body: unknown
    try {
      body = await parseBody(request)
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }

    const parsed = parseWaitlistPayload(body, {
      userAgent: request.headers.get("user-agent"),
      ipHash: hashIp(clientIp),
    })

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    if (!checkRateLimit(emailRateLimiter, parsed.data.email, MAX_REQUESTS_PER_EMAIL)) {
      return NextResponse.json({ error: "Too many attempts for this email. Please try later." }, { status: 429 })
    }

    if (parsed.honeypotTriggered) {
      return NextResponse.json({ success: true, skipped: true, message: SUCCESS_WAITLIST_MESSAGE }, { status: 200 })
    }

    const supabase = createServerSupabaseClient()
    const insertResult = await insertWaitlistRecord(supabase, parsed.data)

    if (insertResult.error) {
      console.error("[waitlist] Insert error", {
        table: getStorageMode(),
        code: insertResult.error.code,
        message: insertResult.error.message,
      })

      if (isDuplicateError(insertResult.error.code, insertResult.error.message)) {
        return NextResponse.json({ error: DUPLICATE_WAITLIST_MESSAGE }, { status: 409 })
      }

      if (shouldAllowEmailOnlyFallback() && isSchemaFailure(insertResult.error)) {
        const emailDelivery = await sendWaitlistEmails({
          ...insertResult.payload,
          created_at: new Date().toISOString(),
        })

        if (emailDelivery.adminSent) {
          return NextResponse.json(
            {
              success: true,
              message: SUCCESS_WAITLIST_MESSAGE,
              adminEmailSent: emailDelivery.adminSent,
              confirmationEmailSent: emailDelivery.confirmationSent,
              emailConfigured: emailDelivery.configured,
              storageTarget: "private_email_fallback",
              degradedStorage: true,
            },
            { status: 200 }
          )
        }
      }

      return NextResponse.json({ error: "Unable to join the waitlist right now." }, { status: 500 })
    }

    const notificationSignup = {
      ...insertResult.payload,
      created_at: insertResult.data?.created_at || new Date().toISOString(),
      referral_code: insertResult.data?.referral_code || insertResult.payload.referral_code || null,
    }
    const emailDelivery = await sendWaitlistEmails(notificationSignup)

    return NextResponse.json(
      {
        success: true,
        message: SUCCESS_WAITLIST_MESSAGE,
        adminEmailSent: emailDelivery.adminSent,
        confirmationEmailSent: emailDelivery.confirmationSent,
        emailConfigured: emailDelivery.configured,
        storageTarget: getStorageMode(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[waitlist] Unhandled waitlist error", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
