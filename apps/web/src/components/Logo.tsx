interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-10 h-10" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="20" fill="#3b82f6" />
      <circle cx="50" cy="50" r="35" fill="white" />
      <text
        x="50"
        y="65"
        fontSize="55"
        fontFamily="serif"
        fontStyle="italic"
        fontWeight="bold"
        fill="#3b82f6"
        textAnchor="middle"
      >
        R
      </text>
      <path
        d="M25 75 L28 65 L31 75 L41 78 L31 81 L28 91 L25 81 L15 78 Z"
        fill="white"
      />
    </svg>
  );
}
