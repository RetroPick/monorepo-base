interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = '', size = 120 }: LogoProps) {
  return (
    <img
      src="/images/retropick-logo.png"
      alt="RetroPick"
      width={size}
      height={size}
      className={`rounded-full drop-shadow-[0_0_36px_rgba(126,184,255,0.34)] ${className}`}
    />
  );
}

export function LogoMark({ className = '', size = 40 }: LogoProps) {
  return (
    <img
      src="/images/retropick-logo.png"
      alt="RetroPick"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
