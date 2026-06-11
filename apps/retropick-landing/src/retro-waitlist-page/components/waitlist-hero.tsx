"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AbsorptionAnimation } from "@/components/absorption-animation"

export default function WaitlistHero() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const words = [
    "No disputes",
    "No Human judges",
    "deterministic",
    "hedging",
    "markets",
    "onchain",
    "instant",
    "settlement",
    "frictionless",
    "trustless",
    "profitable",
  ]

  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const currentWord = words[currentWordIndex]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % words.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [words.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setStatus("error")
      setMessage("Please enter a valid email address")
      return
    }

    setStatus("loading")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: "landing",
        }),
      })

      let data: {
        error?: string
        success?: boolean
        message?: string
        emailSent?: boolean
      } = {}
      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text) as typeof data
        }
      } catch {
        data = {}
      }

      if (response.ok) {
        setStatus("success")
        const defaultMsg = "You're on the list. Check your inbox for your confirmation email."
        setMessage(data.message || defaultMsg)
        setEmail("")

        const dismissMs = data.emailSent === false ? 10_000 : 6000
        setTimeout(() => {
          setStatus("idle")
          setMessage("")
        }, dismissMs)
      } else {
        setStatus("error")
        const serverMsg = data.error
        setMessage(serverMsg || `Request failed (${response.status}). Please try again.`)
      }
    } catch {
      setStatus("error")
      setMessage("Network error. Check your connection and try again.")
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-visible">
      {/* Background Space Scene */}
      <div className="absolute inset-0 bg-[var(--color-bg-0)]">
        {/* Animated glow orbs */}
        <div
          className="glow-orb absolute top-1/4 left-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{
            transform: "translate(-50%, -50%)",
            backgroundColor: "var(--color-glow-1)",
          }}
        />
        <div
          className="glow-orb absolute bottom-1/3 left-1/3 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{
            animationDelay: "-7s",
            backgroundColor: "var(--color-glow-2)",
          }}
        />

        {/* Planet horizon at bottom */}
        <div className="absolute -bottom-[40%] left-1/2 -translate-x-1/2 w-[140%] h-[60%]">
          <div className="relative w-full h-full">
            {/* Planet body */}
            <div
              className="absolute inset-0 rounded-[50%] bg-gradient-to-b"
              style={{
                backgroundImage: `linear-gradient(to bottom, var(--color-bg-1), var(--color-bg-0))`,
              }}
            />
            {/* Atmospheric rim light */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent opacity-30 blur-sm" />
            <div
              className="absolute top-0 left-0 right-0 h-[40px] bg-gradient-to-b from-transparent to-transparent opacity-20 blur-xl"
              style={{
                backgroundImage: `linear-gradient(to bottom, var(--color-glow-2), transparent)`,
              }}
            />
          </div>
        </div>

        <div
          className="absolute left-1/2 -translate-x-1/2 w-[2250px] h-[2250px]"
          style={{ bottom: "calc(-50% - 900px)" }}
        >
          <img src="/images/orb.png" alt="" className="w-full h-full object-contain animate-orb-rotate" />
        </div>

        {/* Absorption Animation */}
        <div className="absolute inset-0 opacity-30">
          <AbsorptionAnimation shape="circle" />
        </div>

        {/* Grain overlay */}
        <div
          className="grain absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle, transparent, transparent, var(--color-bg-0))`,
          }}
        />
      </div>

      {/* Content Stage */}
      <div className="relative z-10 w-full max-w-[680px]">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Logo */}
          <div className="mb-4">
            <img
              src="/retropick-logo.png"
              alt="RetroPick"
              className="h-20 w-20 drop-shadow-lg"
            />
          </div>

          {/* Badge */}
          <div
            className="inline-flex items-center h-[28px] px-3 rounded-full border backdrop-blur-sm"
            style={{
              borderColor: "var(--color-stroke)",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <span className="text-[13px] font-medium" style={{ color: "var(--color-text-1)" }}>
              Waitlist • Summer 2026
            </span>
          </div>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight"
            style={{
              color: "var(--color-text-0)",
              textShadow: "0 1px 18px var(--color-shadow)",
            }}
          >
            Trade Markets{" "}
            <span className="font-serif italic font-normal inline-block" style={{ fontFamily: "var(--font-playfair)" }}>
              <AnimatePresence mode="wait">
                <motion.span key={currentWord} className="inline-block">
                  {currentWord.split("").map((char, index) => (
                    <motion.span
                      key={`${currentWord}-${index}`}
                      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.03,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                      style={{ display: "inline-block" }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </motion.span>
                  ))}
                </motion.span>
              </AnimatePresence>
            </span>
            <br />
            That Never Existed Onchain
          </h1>

          {/* Supporting copy */}
          <p
            className="text-[15px] sm:text-base max-w-[520px] leading-relaxed"
            style={{ color: "var(--color-text-1)" }}
          >
            Hedge exposure across 68+ deterministic markets in global economics, climate, and tech. 100% deterministic, zero dispute windows, and settle instantly without human judges while earning up to 4% APY.
          </p>

          {/* Waitlist Form + status: flex column keeps success copy from overlapping the button row */}
          <div className="w-full max-w-[480px] mx-auto mt-2 flex flex-col items-center gap-4">
            <form onSubmit={handleSubmit} className="w-full flex justify-center">
              <div className="relative w-full">
                {/* Mobile Layout - always visible, stacked */}
                <div className="flex flex-col gap-3 sm:hidden">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading" || status === "success"}
                    className="w-full pr-4 text-white placeholder:opacity-100 h-14 rounded-xl"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 1)",
                      borderColor: "var(--color-stroke)",
                      color: "white",
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={status === "loading" || status === "success"}
                    className="w-full px-6 bg-white hover:bg-gray-100 text-[#0B0B0F] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl"
                  >
                    {status === "loading" ? "Joining..." : status === "success" ? "Joined!" : "Join Waitlist"}
                  </Button>
                </div>

                {/* Desktop Layout - with animation (min-height: absolute button does not collapse row) */}
                <motion.div
                  className="relative hidden sm:block min-h-[3.25rem]"
                  animate={{
                    width: status === "success" ? "200px" : "100%",
                  }}
                  transition={{
                    duration: 0.5,
                    ease: [0.21, 0.47, 0.32, 0.98],
                  }}
                  style={{
                    margin: "0 auto",
                  }}
                >
                  <AnimatePresence>
                    {status !== "success" && (
                      <motion.div
                        initial={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8, width: 0 }}
                        transition={{
                          duration: 0.4,
                          ease: [0.21, 0.47, 0.32, 0.98],
                        }}
                      >
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={status === "loading"}
                          className="w-full pr-[140px] text-white placeholder:opacity-100 h-14 rounded-xl"
                          style={{
                            backgroundColor: "rgba(0, 0, 0, 1)",
                            borderColor: "var(--color-stroke)",
                            color: "white",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.div
                    className="absolute top-1"
                    animate={{
                      right: status === "success" ? "0" : "4px",
                      left: status === "success" ? "0" : "auto",
                      width: status === "success" ? "100%" : "auto",
                    }}
                    transition={{
                      duration: 0.5,
                      ease: [0.21, 0.47, 0.32, 0.98],
                    }}
                  >
                    <Button
                      type="submit"
                      disabled={status === "loading" || status === "success"}
                      className="w-full px-6 bg-white hover:bg-gray-100 text-[#0B0B0F] font-semibold transition-all hover:-translate-y-[1px] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-12 rounded-xl"
                    >
                      {status === "loading" ? "Joining..." : status === "success" ? "Joined!" : "Join Waitlist"}
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </form>

            <AnimatePresence mode="wait">
              {message ? (
                <motion.p
                  key={message}
                  role="status"
                  aria-live="polite"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="w-full text-center text-[14px] sm:text-[15px] leading-relaxed px-2 shrink-0"
                  style={{
                    color: status === "error" ? "#fca5a5" : "var(--color-text-1)",
                  }}
                >
                  {message}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Micro-credit */}
          <div className="pt-4"></div>
          <p className="text-xs sm:text-sm" style={{ color: "var(--color-text-1)" }}>
            Community:{" "}
            <a
              href="https://discord.gg/5EsnWvcErv"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
              style={{ color: "var(--color-text-0)" }}
            >
              Discord
            </a>{" "}
            |{" "}
            <a
              href="https://t.me/RetroPickMarket"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
              style={{ color: "var(--color-text-0)" }}
            >
              Telegram
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
