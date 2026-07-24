interface BackerBadgeProps {
  className?: string;
  small?: boolean;
}

export default function BackerBadge({ className = "", small = false }: BackerBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-[#333] bg-[rgba(30,30,30,0.8)] backdrop-blur-sm ${small ? "px-4 py-1.5" : "px-5 py-2"} ${className}`}
    >
      <span className={`text-rp-text-muted ${small ? "text-[11px]" : "text-[13px]"}`}>
        Built for
      </span>
      <span className={`text-white font-medium ${small ? "text-[11px]" : "text-[13px]"}`}>
        source evidence
      </span>
      <span className={`text-white font-medium ${small ? "text-[11px]" : "text-[13px]"}`}>
        USDC settlement
      </span>
    </div>
  );
}
