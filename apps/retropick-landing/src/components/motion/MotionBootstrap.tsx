"use client"

import { useEffect } from "react"
import { ensureMotionPlugins, ScrollTrigger, usePrefersReducedMotion } from "@/lib/motion"

export default function MotionBootstrap() {
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    ensureMotionPlugins()

    if (prefersReducedMotion) return

    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 0)

    return () => window.clearTimeout(refreshId)
  }, [prefersReducedMotion])

  return null
}
