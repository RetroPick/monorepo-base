import { useEffect, useRef, useState } from 'react';
import { matches } from '../data/matches';

function FlagIcon({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={code}
      className="w-5 h-4 object-cover rounded-sm"
      loading="lazy"
    />
  );
}

function ProbabilityBar({ percent, delay = 0 }: { percent: number; delay?: number }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth(percent), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [percent, delay]);

  return (
    <div ref={ref} className="w-full h-1 bg-[#E0E0E0] rounded-full overflow-hidden mt-2">
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out"
        style={{
          width: `${width}%`,
          background: 'linear-gradient(90deg, #4CAF50, #81C784)',
        }}
      />
    </div>
  );
}

export default function MatchPredictions() {
  return (
    <section className="bg-[#F5F5F5] pt-12 pb-6 px-4 lg:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Match Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {matches.map((match, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-[#E0E0E0] p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-semibold text-[#666] uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {match.group}
                </span>
                <span className="text-[11px] text-[#999]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {match.date}
                </span>
              </div>

              {/* Team 1 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FlagIcon code={match.team1.code} />
                  <span className="text-sm font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {match.team1.name}
                  </span>
                </div>
                <span className="font-display font-bold text-base text-[#1A1A1A]">
                  {match.team1.percent}%
                </span>
              </div>

              {/* Team 2 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FlagIcon code={match.team2.code} />
                  <span className="text-sm font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {match.team2.name}
                  </span>
                </div>
                <span className="font-display font-bold text-base text-[#1A1A1A]">
                  {match.team2.percent}%
                </span>
              </div>

              <ProbabilityBar percent={match.team1.percent} delay={idx * 150} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
