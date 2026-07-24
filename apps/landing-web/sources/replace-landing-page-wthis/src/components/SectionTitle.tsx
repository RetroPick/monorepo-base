interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionTitle({ children, className = '' }: SectionTitleProps) {
  return (
    <h2
      className={`text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight gradient-title ${className}`}
    >
      {children}
    </h2>
  );
}
