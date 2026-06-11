"use client"

import { useEffect, useRef } from "react"

type Particle = {
  gridX: number
  gridY: number
  opacity: number
  targetOpacity: number
  size: number
  targetSize: number
  flickerSpeed: number
  scale: number
  targetScale: number
  distanceFromCenter: number
  baseSize: number
}

type Wave = {
  startTime: number
}

export function AbsorptionAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const gridInfoRef = useRef({ cols: 0, rows: 0, spacing: 8 })
  const wavesRef = useRef<Wave[]>([])
  const lastWaveCreationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const initializeParticles = () => {
      const spacing = 10
      const cols = Math.ceil(canvas.width / spacing)
      const rows = Math.ceil(canvas.height / spacing)

      gridInfoRef.current = { cols, rows, spacing }
      const centerCol = cols / 2
      const centerRow = rows / 2

      particlesRef.current = []
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const baseSize = Math.random() * 1.2 + 0.6
          const distanceFromCenter = Math.hypot(col - centerCol, row - centerRow)

          particlesRef.current.push({
            gridX: col * spacing + spacing / 2,
            gridY: row * spacing + spacing / 2,
            opacity: Math.random() * 0.2,
            targetOpacity: 0,
            size: baseSize,
            targetSize: baseSize,
            flickerSpeed: Math.random() * 0.05 + 0.04,
            scale: 1,
            targetScale: 1,
            distanceFromCenter,
            baseSize,
          })
        }
      }
    }

    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initializeParticles()
    }

    const drawParticle = (particle: Particle) => {
      ctx.fillStyle = `rgba(212, 239, 255, ${particle.opacity})`
      ctx.beginPath()
      ctx.arc(particle.gridX, particle.gridY, particle.size * particle.scale, 0, Math.PI * 2)
      ctx.fill()
    }

    const drawStatic = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current.forEach((particle) => {
        particle.opacity = Math.max(0.03, 0.18 - particle.distanceFromCenter / 500)
        drawParticle(particle)
      })
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const maxDistance = Math.max(gridInfoRef.current.cols, gridInfoRef.current.rows) * 0.8
      const currentTime = Date.now()

      if (wavesRef.current.length === 0 || currentTime - lastWaveCreationRef.current >= 900) {
        wavesRef.current.push({ startTime: currentTime })
        lastWaveCreationRef.current = currentTime
      }

      wavesRef.current = wavesRef.current.filter((wave) => {
        const waveAge = (currentTime - wave.startTime) / 1000
        return waveAge * 28 < maxDistance + 20
      })

      particlesRef.current.forEach((particle) => {
        let maxOpacity = 0.03
        let maxScale = 0.7

        wavesRef.current.forEach((wave) => {
          const waveRadius = ((currentTime - wave.startTime) / 1000) * 28
          const distanceDiff = Math.abs(particle.distanceFromCenter - waveRadius)
          const waveWidth = 15

          if (distanceDiff < waveWidth) {
            const intensity = (1 - distanceDiff / waveWidth) * Math.max(0, 1 - particle.distanceFromCenter / (maxDistance * 1.5))
            maxOpacity = Math.max(maxOpacity, intensity * 0.42)
            maxScale = Math.max(maxScale, 0.8 + intensity * 1.8)
          }
        })

        particle.targetOpacity = maxOpacity
        particle.targetScale = maxScale
        particle.targetSize = particle.baseSize
        particle.opacity += (particle.targetOpacity - particle.opacity) * particle.flickerSpeed
        particle.scale += (particle.targetScale - particle.scale) * particle.flickerSpeed
        particle.size += (particle.targetSize - particle.size) * particle.flickerSpeed
        drawParticle(particle)
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    setCanvasSize()
    window.addEventListener("resize", setCanvasSize)

    if (prefersReducedMotion) {
      drawStatic()
    } else {
      animate()
    }

    return () => {
      window.removeEventListener("resize", setCanvasSize)
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
