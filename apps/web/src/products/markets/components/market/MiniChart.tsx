interface MiniChartProps {
  points: number[];
  positive?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export function MiniChart({ points, positive = true, className, width = 80, height = 32 }: MiniChartProps) {
  if (points.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeOpacity={0.2} />
      </svg>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);

  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke = positive ? "hsl(var(--yes))" : "hsl(var(--no))";

  return (
    <svg width={width} height={height} className={className} aria-hidden viewBox={`0 0 ${width} ${height}`}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
