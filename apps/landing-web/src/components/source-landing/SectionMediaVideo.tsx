interface SectionMediaVideoProps {
  src: string;
  title: string;
  className?: string;
}

export default function SectionMediaVideo({ src, title, className = "" }: SectionMediaVideoProps) {
  return (
    <video
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      aria-label={title}
      className={className}
    />
  );
}
