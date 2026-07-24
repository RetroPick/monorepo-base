interface SectionTitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function SectionTitle({ children, className = "" }: SectionTitleProps) {
  return (
    <h2 className={`gradient-title text-5xl font-semibold tracking-tight md:text-6xl lg:text-7xl ${className}`}>
      {children}
    </h2>
  );
}
