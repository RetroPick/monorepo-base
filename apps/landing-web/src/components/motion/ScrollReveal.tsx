"use client"

import type { ReactNode } from "react"
import { useRef } from "react"
import { ensureMotionPlugins, gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion"

type ScrollRevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  distance?: number
  duration?: number
  start?: string
}

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 32,
  duration = 0.8,
  start = "top 84%",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  ensureMotionPlugins()

  useGSAP(
    () => {
      if (prefersReducedMotion || !ref.current) return

      gsap.from(ref.current, {
        y: distance,
        opacity: 0,
        duration,
        delay,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ref.current,
          start,
          toggleActions: "play none none none",
        },
      })
    },
    {
      scope: ref,
      dependencies: [prefersReducedMotion, delay, distance, duration, start],
      revertOnUpdate: true,
    }
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
