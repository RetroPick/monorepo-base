import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({
  size = 24,
  rounded = true,
  className,
}: {
  size?: number
  rounded?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden',
        rounded && 'rounded-lg shadow-xs border border-border/40',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.webp"
        alt="RetroPick"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </span>
  )
}
