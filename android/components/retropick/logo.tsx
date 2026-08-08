import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({
  size = 28,
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
        rounded && 'rounded-full',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/retropick-logo-ribbon.png"
        alt="RetroPick"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </span>
  )
}
