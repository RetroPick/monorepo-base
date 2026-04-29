import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Omit or pass empty string for decorative contexts */
  alt?: string;
}

export default function Logo({ className = "size-10", alt = "RetroPick" }: LogoProps) {
  return (
    <img
      src="/retropick-logo.png"
      alt={alt}
      className={cn("aspect-square rounded-full object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}
