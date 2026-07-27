import { cn } from '@/lib/utils'

export function MiniChart({
  data,
  up,
  width = 96,
  height = 40,
  className,
  strokeWidth = 2,
  tone,
}: {
  data: number[]
  up: boolean
  width?: number
  height?: number
  className?: string
  strokeWidth?: number
  tone?: 'yes' | 'no' | 'brand'
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)

  const points = data.map((d, i) => {
    const x = i * stepX
    const y = height - ((d - min) / range) * (height - 4) - 2
    return [x, y] as const
  })

  const line = points.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`
  const color =
    tone === 'brand'
      ? 'var(--primary)'
      : tone === 'yes'
        ? 'var(--yes)'
        : tone === 'no'
          ? 'var(--no)'
          : up
            ? 'var(--yes)'
            : 'var(--no)'
  const id = `g-${tone ?? (up ? 'u' : 'd')}-${data[0].toFixed(0)}-${width}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
