"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, CheckCircle2 } from "lucide-react"
import { AbsorptionAnimation } from "@/components/waitlist/AbsorptionAnimation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ensureMotionPlugins, gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion"
import { WAITLIST_PRIMARY_USE_CASE_OPTIONS, WAITLIST_ROLE_OPTIONS } from "@/lib/waitlist"

type SubmitStatus = "idle" | "loading" | "success" | "error"

type FormState = {
  email: string
  role: string
  primary_use_case: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_content: string
  utm_term: string
  referred_by: string
  landing_path: string
  company_website: string
}

const rotatingWords = [
  "crypto",
  "macro",
  "stocks",
  "web3",
  "sport",
  "gaming",
  "tech",
  "science",
  "weather",
  "world events",
  "more",
]
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const initialFormState: FormState = {
  email: "",
  role: "",
  primary_use_case: "",
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
    // Attribution fields are populated after hydration to avoid reading the URL during server render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const scrollToDemo = () => {
    const target = document.getElementById("demo")
    if (!target) return

    const offset = 96
    const top = target.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo({ top, behavior: "smooth" })
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

      <div className="absolute inset-0 opacity-55">
        <AbsorptionAnimation />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
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
              <h1
                data-hero-reveal
                className="max-w-3xl text-balance text-4xl font-semibold leading-[1.04] tracking-tight text-white [text-shadow:0_1px_18px_rgba(0,30,80,0.6)] sm:text-5xl lg:text-[5.5rem]"
              >
                Trade Markets
                <span className="block font-serif italic font-normal text-cyan-100" style={{ fontFamily: "var(--font-playfair, ui-serif, Georgia, serif)" }}>
                  {currentWord}
                </span>
                <span className="block mt-3">That Never Existed Onchain</span>
              </h1>
            </div>

            <div
              data-hero-reveal
              className="mx-auto max-w-xl rounded-[30px] border border-cyan-200/10 bg-[linear-gradient(180deg,rgba(11,18,51,0.9),rgba(4,9,28,0.92))] p-5 shadow-[0_30px_90px_rgba(3,8,25,0.55)] backdrop-blur-xl sm:p-7"
            >
              <form onSubmit={handleSubmit} noValidate className="grid gap-4">
                <div className="grid gap-4">
                  <div>
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="waitlist-role" className="mb-2 block text-sm font-medium text-white/82">
                        Who are you?
                      </label>
                      <Select value={form.role} onValueChange={(value) => setField("role", value)} disabled={status === "loading"}>
                        <SelectTrigger
                          id="waitlist-role"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-left text-white focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950/95 border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                          {WAITLIST_ROLE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option} className="text-white">
                              {roleLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="waitlist-primary-use-case" className="mb-2 block text-sm font-medium text-white/82">
                        What do you want RetroPick for?
                      </label>
                      <Select value={form.primary_use_case} onValueChange={(value) => setField("primary_use_case", value)} disabled={status === "loading"}>
                        <SelectTrigger
                          id="waitlist-primary-use-case"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-left text-white focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <SelectValue placeholder="Select use case" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-950/95 border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.35)]">
                          {WAITLIST_PRIMARY_USE_CASE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option} className="text-white">
                              {useCaseLabels[option]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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

                <button
                  type="button"
                  onClick={scrollToDemo}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Continue to RetroPick
                  <ChevronDown className="h-4 w-4" />
                </button>

                <p
                  role="status"
                  aria-live="polite"
                  className={`mt-4 text-sm leading-6 ${status === "error" ? "text-red-300" : "text-white/72"}`}
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
                    message || "Early users help shape today’s most compelling markets, earn first access, and influence which stories get priced first."
                  )}
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
