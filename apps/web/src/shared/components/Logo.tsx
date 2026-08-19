"use client";

import Image from "next/image";

import { cn } from "@/shared/lib/utils";

interface LogoProps {
  className?: string;
  alt?: string;
  size?: number;
  priority?: boolean;
}

export default function Logo({
  className = "size-10",
  alt = "RetroPick",
  size = 40,
  priority = false,
}: LogoProps) {
  return (
    <Image
      src="/logo-baru.webp"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      sizes={`${size}px`}
      className={cn("aspect-square object-contain", className)}
    />
  );
}
