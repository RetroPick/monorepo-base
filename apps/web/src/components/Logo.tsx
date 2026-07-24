"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Omit or pass empty string for decorative contexts */
  alt?: string;
  /** Override the rendered pixel size. Defaults to 40 (matches `size-10`). */
  size?: number;
  /** When this Logo is the LCP element (rare), set to true. */
  priority?: boolean;
}

/**
 * Static brand logo backed by `/public/retropick-logo.png`. Routes through
 * Next's runtime image loader so it gets served as AVIF/WebP where supported.
 */
export default function Logo({
  className = "size-10",
  alt = "RetroPick",
  size = 40,
  priority = false,
}: LogoProps) {
  return (
    <Image
      src="/retropick-logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={cn("aspect-square rounded-full object-contain", className)}
    />
  );
}
