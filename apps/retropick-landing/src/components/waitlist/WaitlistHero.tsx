"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { AbsorptionAnimation } from "@/components/waitlist/AbsorptionAnimation"
import { ensureMotionPlugins, gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion"
import { WAITLIST_PRIMARY_USE_CASE_OPTIONS, WAITLIST_ROLE_OPTIONS, WAITLIST_SOURCE_OPTIONS } from "@/lib/waitlist"

type SubmitStatus = "idle" | "loading" | "success" | "error"

type FormState = {
  email: string
  name: string
  x_handle: string
  telegram: string
  role: string
  primary_use_case: string
  source: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  referred_by: string
  landing_path: string
  company_website: string
}

const rotatingWords = ["deterministic", "hedging", "macro risk", "crypto events", "market structure", "real-world risk"]
const longestRotatingWord = rotatingWords.reduce((longest, word) => (word.length > longest.length ? word : longest), "")
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const initialFormState: FormState = {
  email: "",
  name: "",
  x_handle: "",
  telegram: "",
  role: "",
  primary_use_case: "",
  source: "",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_content: "",
  utm_term: "",
  referred_by: "",
  landing_path: "",
  company_website: "",
}

const roleLabels: Record<(typeof WAITLIST_ROLE_OPTIONS)[number], string> = {
  trader: "Trader",
  builder: "Builder",
  founder: "Founder",
  researcher: "Researcher",
  market_maker: "Market maker",
  defi_user: "DeFi user",
  crypto_native: "Crypto native",
  macro_trader: "Macro trader",
  investor: "Investor",
  other: "Other",
}

const useCaseLabels: Record<(typeof WAITLIST_PRIMARY_USE_CASE_OPTIONS)[number], string> = {
  crypto_event_trading: "Crypto event trading",
  macro_event_trading: "Macro event trading",
  hedging: "Hedging",
  prediction_markets: "Prediction markets",
  research: "Research",
  market_making: "Market making",
  alerts: "Alerts",
  api_data: "API / data",
  other: "Other",
}

const sourceLabels: Record<(typeof WAITLIST_SOURCE_OPTIONS)[number], string> = {
  website: "Website",
  crypto_twitter: "Crypto Twitter / X",
  telegram: "Telegram",
  discord: "Discord",
  friend: "Friend",
  referral: "Referral",
  search: "Search",
  podcast: "Podcast",
  newsletter: "Newsletter",
  manual_test: "Manual test",
  other: "Other",
}

export default function WaitlistHero() {
  const [form, setForm] = useState<FormState>(initialFormState)
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const [message, setMessage] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const orbRef = useRef<HTMLDivElement>(null)
  const topGlowRef = useRef<HTMLDivElement>(null)
  const bottomGlowRef = useRef<HTMLDivElement>(null)
  const horizonRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  const currentWord = rotatingWords[wordIndex]

  ensureMotionPlugins()

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 2600)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const focusEmail = () => emailInputRef.current?.focus()
    window.addEventListener("retropick:focus-waitlist", focusEmail)
    return () => window.removeEventListener("retropick:focus-waitlist", focusEmail)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setForm((current) => ({
      ...current,
      utm_source: params.get("utm_source") ?? "",
      utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "",
      utm_content: params.get("utm_content") ?? "",
      utm_term: params.get("utm_term") ?? "",
      referred_by: params.get("ref") ?? "",
      landing_path: `${window.location.pathname}${window.location.search}`,
    }))
  }, [])

  const buttonLabel = useMemo(() => {
    if (status === "loading") return "Joining..."
    if (status === "success") return "Joined"
    return "Join Waitlist"
  }, [status])

  const setField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (status !== "idle") {
      setStatus("idle")
      setMessage("")
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedEmail = form.email.trim().toLowerCase()
    if (!emailRegex.test(normalizedEmail)) {
      setStatus("error")
      setMessage("Enter a valid email address.")
      return
    }

    setStatus("loading")
    setMessage("")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          email: normalizedEmail,
        }),
      })

      let payload: { error?: string; message?: string } = {}
      try {
        const text = await response.text()
        payload = text ? (JSON.parse(text) as typeof payload) : {}
      } catch {
        payload = {}
      }

      if (!response.ok) {
        setStatus("error")
        setMessage(payload.error || `Request failed (${response.status}). Try again.`)
        return
      }

      setStatus("success")
      setMessage(payload.message || "You’re on the RetroPick waitlist.")
      setForm((current) => ({
        ...initialFormState,
        utm_source: current.utm_source,
        utm_medium: current.utm_medium,
        utm_campaign: current.utm_campaign,
        utm_content: current.utm_content,
        utm_term: current.utm_term,
        referred_by: current.referred_by,
        landing_path: current.landing_path,
      }))
    } catch {
      setStatus("error")
      setMessage("Network error. Check your connection and try again.")
    }
  }

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return

      const introTimeline = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      })

      introTimeline.from("[data-hero-reveal]", {
        y: 36,
        opacity: 0,
        duration: 0.88,
        stagger: 0.1,
        clearProps: "transform,opacity",
      })

      if (contentRef.current) {
        gsap.to(contentRef.current, {
          yPercent: -4,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })
      }

      if (orbRef.current) {
        gsap.to(orbRef.current, {
          yPercent: -10,
          scale: 1.05,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })
      }

      const parallaxLayers = [
        { ref: topGlowRef, yPercent: -12, scale: 1.05 },
        { ref: bottomGlowRef, yPercent: -8, scale: 1.08 },
        { ref: horizonRef, yPercent: -6, scale: 1.02 },
      ]

      parallaxLayers.forEach(({ ref, yPercent, scale }) => {
        if (!ref.current) return

        gsap.to(ref.current, {
          yPercent,
          scale,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })
      })
    },
    {
      scope: sectionRef,
      dependencies: [prefersReducedMotion],
      revertOnUpdate: true,
    }
  )

  return (
    <section id="hero" ref={sectionRef} className="relative min-h-screen overflow-hidden bg-[#0a0f2e] text-white">
      <div className="absolute inset-0 bg-[#0a0f2e]">
        <div
          ref={topGlowRef}
          className="glow-orb absolute left-1/2 top-1/4 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b7cff] blur-[120px]"
        />
        <div
          ref={bottomGlowRef}
          className="glow-orb absolute bottom-1/3 left-1/3 h-[500px] w-[500px] rounded-full bg-[#2563eb] blur-[100px] [animation-delay:-7s]"
        />

        <div ref={horizonRef} className="absolute -bottom-[40%] left-1/2 h-[60%] w-[140%] -translate-x-1/2 will-change-transform">
          <div className="relative h-full w-full">
            <div className="absolute inset-0 rounded-[50%] bg-gradient-to-b from-[#0f1840]/45 to-[#0a0f2e]" />
          </div>
        </div>

        <div
          ref={orbRef}
          className="absolute left-1/2 h-[2250px] w-[2250px] -translate-x-1/2 bottom-[calc(-50%_-_900px)] will-change-transform"
        >
          <img src="/images/orb.png" alt="" className="h-full w-full animate-orb-rotate object-contain" />
        </div>
      </div>

      <div className="absolute inset-0 opacity-30">
        <AbsorptionAnimation />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle,transparent,transparent,#0a0f2e)] opacity-60" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pb-10 pt-28 sm:px-6 sm:pt-32 md:px-8">
        <div ref={contentRef} className="w-full max-w-6xl will-change-transform">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            <div className="max-w-2xl">
              <div
                data-hero-reveal
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-cyan-100 backdrop-blur"
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                <span className="text-white/75">Event-driven markets for</span>
                <span className="relative inline-grid min-w-[14ch] text-rp-blue-bright">
                  <span className="invisible" aria-hidden="true">
                    {longestRotatingWord}
                  </span>
                  <span key={currentWord} className="absolute inset-0 animate-word-swap whitespace-nowrap">
                    {currentWord}
                  </span>
                </span>
              </div>

              <h1
                data-hero-reveal
                className="max-w-3xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-white [text-shadow:0_1px_18px_rgba(0,30,80,0.6)] sm:text-5xl lg:text-6xl"
              >
                Join the RetroPick Waitlist
              </h1>

              <p
                data-hero-reveal
                className="mt-6 max-w-xl text-pretty text-base leading-8 text-white/76 sm:text-lg"
              >
                Get early access to event-driven prediction markets for crypto, macro, and real-world risk.
              </p>

              <p data-hero-reveal className="mt-5 max-w-xl text-sm leading-7 text-white/62 sm:text-base">
                Trade deterministic markets built for hedging uncertainty, pricing catalysts, and resolving on source-backed rules
                instead of subjective dispute windows.
              </p>
            </div>

            <div
              data-hero-reveal
              className="rounded-[30px] border border-cyan-200/10 bg-[linear-gradient(180deg,rgba(11,18,51,0.9),rgba(4,9,28,0.92))] p-5 shadow-[0_30px_90px_rgba(3,8,25,0.55)] backdrop-blur-xl sm:p-7"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Qualified early access</h2>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Tell us how you trade and what RetroPick should help you price first.
                  </p>
                </div>
                <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-cyan-100">
                  Launch cohort
                </div>
              </div>

              <form onSubmit={handleSubmit} noValidate className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="waitlist-email" className="mb-2 block text-sm font-medium text-white/82">
                      Email
                    </label>
                    <input
                      ref={emailInputRef}
                      id="waitlist-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      placeholder="you@fund.com"
                      value={form.email}
                      onChange={(event) => setField("email", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none placeholder:text-white/36 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="waitlist-name" className="mb-2 block text-sm font-medium text-white/82">
                      Name
                    </label>
                    <input
                      id="waitlist-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Optional"
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none placeholder:text-white/36 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="waitlist-x-handle" className="mb-2 block text-sm font-medium text-white/82">
                      X / Twitter handle
                    </label>
                    <input
                      id="waitlist-x-handle"
                      type="text"
                      autoComplete="off"
                      placeholder="@handle"
                      value={form.x_handle}
                      onChange={(event) => setField("x_handle", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none placeholder:text-white/36 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="waitlist-telegram" className="mb-2 block text-sm font-medium text-white/82">
                      Telegram
                    </label>
                    <input
                      id="waitlist-telegram"
                      type="text"
                      autoComplete="off"
                      placeholder="@username"
                      value={form.telegram}
                      onChange={(event) => setField("telegram", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none placeholder:text-white/36 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label htmlFor="waitlist-role" className="mb-2 block text-sm font-medium text-white/82">
                      Who are you?
                    </label>
                    <select
                      id="waitlist-role"
                      value={form.role}
                      onChange={(event) => setField("role", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="" className="bg-slate-950 text-white">
                        Select role
                      </option>
                      {WAITLIST_ROLE_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-slate-950 text-white">
                          {roleLabels[option]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="waitlist-primary-use-case" className="mb-2 block text-sm font-medium text-white/82">
                      What do you want RetroPick for?
                    </label>
                    <select
                      id="waitlist-primary-use-case"
                      value={form.primary_use_case}
                      onChange={(event) => setField("primary_use_case", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="" className="bg-slate-950 text-white">
                        Select use case
                      </option>
                      {WAITLIST_PRIMARY_USE_CASE_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-slate-950 text-white">
                          {useCaseLabels[option]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="waitlist-source" className="mb-2 block text-sm font-medium text-white/82">
                      How did you find us?
                    </label>
                    <select
                      id="waitlist-source"
                      value={form.source}
                      onChange={(event) => setField("source", event.target.value)}
                      disabled={status === "loading"}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="" className="bg-slate-950 text-white">
                        Select source
                      </option>
                      {WAITLIST_SOURCE_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-slate-950 text-white">
                          {sourceLabels[option]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <input type="hidden" name="utm_source" value={form.utm_source} readOnly />
                <input type="hidden" name="utm_medium" value={form.utm_medium} readOnly />
                <input type="hidden" name="utm_campaign" value={form.utm_campaign} readOnly />
                <input type="hidden" name="utm_content" value={form.utm_content} readOnly />
                <input type="hidden" name="utm_term" value={form.utm_term} readOnly />
                <input type="hidden" name="referred_by" value={form.referred_by} readOnly />
                <input type="hidden" name="landing_path" value={form.landing_path} readOnly />
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company-website">Company website</label>
                  <input
                    id="company-website"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company_website}
                    onChange={(event) => setField("company_website", event.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-[#09101f] transition hover:-translate-y-px hover:bg-cyan-50 hover:shadow-[0_18px_40px_rgba(153,246,228,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
                  {buttonLabel}
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-sm leading-6 ${status === "error" ? "text-red-300" : "text-white/72"}`}
                  >
                    {status === "success" ? (
                      <>
                        You’re on the RetroPick waitlist. We’ll contact you from{" "}
                        <a href="mailto:rudeus33@retropick.xyz" className="text-cyan-200 underline underline-offset-4">
                          rudeus33@retropick.xyz
                        </a>
                        .
                      </>
                    ) : (
                      message || "Early users help shape market categories, APIs, and launch access."
                    )}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
