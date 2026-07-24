interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlowCard({ children, className = "" }: GlowCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-[#1b1f29] bg-[#0a0a0c] p-8 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.03),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent_42%,transparent_68%,rgba(126,184,255,0.018))]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#79bcff]/50 to-transparent" />
      <div className="pointer-events-none absolute inset-[1px] rounded-2xl border border-white/[0.04]" />
      {children}
    </div>
  );
}
