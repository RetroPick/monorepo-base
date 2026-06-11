interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlowCard({ children, className = '' }: GlowCardProps) {
  return (
    <div
      className={`bg-rp-card border border-rp-border rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#333] hover:shadow-glow-blue ${className}`}
    >
      {children}
    </div>
  );
}
