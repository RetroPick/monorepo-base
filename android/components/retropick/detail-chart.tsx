'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

export const RANGES = ['1h', '6h', '1d', '1w', '1m', 'All']

export function DetailChart({
  data,
  up,
  range = '1d',
  onRangeChange,
  height = 190,
}: {
  data: number[]
  up: boolean
  range?: string
  onRangeChange?: (r: string) => void
  height?: number
}) {
  const gradientId = useId()

  // Generate data variations based on selected timeframe range
  let chartData = [...data]
  if (range === '1h') {
    chartData = data.map((v, i) => Math.max(5, Math.min(95, v + Math.sin(i * 1.5) * 3)))
  } else if (range === '6h') {
    chartData = data.map((v, i) => Math.max(5, Math.min(95, v + Math.cos(i * 1.1) * 5)))
  } else if (range === '1w') {
    chartData = data.map((v, i) => Math.max(5, Math.min(95, v + Math.sin(i * 0.8) * 10)))
  } else if (range === '1m') {
    chartData = data.map((v, i) => Math.max(5, Math.min(95, v + Math.cos(i * 0.6) * 16)))
  } else if (range === 'All') {
    chartData = data.map((v, i) => Math.max(5, Math.min(95, 38 - Math.sin(i * 0.7) * 18 + (i % 2 === 0 ? 4 : -3))))
  }

  const svgWidth = 320
  const svgHeight = height - 28 // Leave room for X-axis labels at bottom

  const maxVal = Math.max(...chartData, 40)
  const minVal = Math.min(...chartData, 10)
  const dataRange = maxVal - minVal || 1
  const stepX = svgWidth / (chartData.length - 1)

  const points = chartData.map((d, i) => {
    const x = i * stepX
    const y = svgHeight - ((d - minVal) / dataRange) * (svgHeight - 20) - 10
    return { x, y, val: d }
  })

  // Build SVG Path with step-like precision lines matching Polymarket
  const pathD = points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x},${point.y}`
    return `${acc} L ${point.x},${point.y}`
  }, '')

  // Build secondary stroke line for multi-outcome look if 'All' range
  const secondaryPoints = points.map((p, i) => ({
    x: p.x,
    y: Math.min(svgHeight - 10, p.y + Math.sin(i) * 25 + 20)
  }))
  const secondaryPathD = secondaryPoints.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x},${point.y}`
    return `${acc} L ${point.x},${point.y}`
  }, '')

  const areaD = `${pathD} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`
  const lastPoint = points[points.length - 1]

  // Date labels for X Axis
  const xLabels = range === 'All' 
    ? ['01/26', '03/26', '05/26', '15:22'] 
    : ['00:00', '06:00', '12:00', '18:00', '23:59']

  // Percentage labels for Y Axis (Matching Polymarket Image 2)
  const yLabels = ['40%', '30%', '20%', '10%']

  return (
    <div className="flex flex-col w-full space-y-2">
      {/* Timeframe Toggles Bar (Matching Polymarket 1h 6h 1d 1w 1m All) */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1 bg-secondary/30 rounded-xl p-1 border border-border/40">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange && onRangeChange(r)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                range === r 
                  ? "bg-card text-foreground shadow-sm border border-border/60" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Area with Y-Axis Percentage Column */}
      <div className="relative flex w-full gap-2 items-stretch" style={{ height: `${height}px` }}>
        {/* Left/Main SVG Canvas */}
        <div className="relative flex-1 h-full flex flex-col justify-between">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full flex-1 overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            <line x1="0" y1={svgHeight * 0.15} x2={svgWidth} y2={svgHeight * 0.15} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1="0" y1={svgHeight * 0.40} x2={svgWidth} y2={svgHeight * 0.40} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1="0" y1={svgHeight * 0.65} x2={svgWidth} y2={svgHeight * 0.65} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <line x1="0" y1={svgHeight * 0.90} x2={svgWidth} y2={svgHeight * 0.90} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />

            {/* Gradient Fill */}
            <path d={areaD} fill={`url(#${gradientId})`} />

            {/* Secondary line for multi-choice look if 'All' */}
            {range === 'All' && (
              <path
                d={secondaryPathD}
                fill="none"
                stroke="#60a5fa"
                strokeWidth="1.8"
                strokeDasharray="3 3"
                strokeOpacity="0.6"
              />
            )}

            {/* Main Primary Chart Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pulse beacon dot on latest data point */}
            {lastPoint && (
              <>
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="5"
                  fill="#3b82f6"
                  fillOpacity="0.4"
                  className="animate-ping"
                />
                <circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r="3"
                  fill="#3b82f6"
                  stroke="#0f172a"
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>

          {/* Bottom X-Axis Date/Time Labels */}
          <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/80 pt-1.5 px-1 border-t border-border/30">
            {xLabels.map((xl, i) => (
              <span key={i}>{xl}</span>
            ))}
          </div>
        </div>

        {/* Right Y-Axis Percentage Labels (Matching Polymarket Image 2) */}
        <div className="flex flex-col justify-between text-[10px] font-bold text-muted-foreground/80 pl-1 pb-6 shrink-0 w-8 border-l border-border/20 text-right">
          {yLabels.map((yl, i) => (
            <span key={i}>{yl}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
