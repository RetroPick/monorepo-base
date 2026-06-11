import { useCountdown } from '../hooks/useCountdown';
import { useEffect, useRef } from 'react';

export default function Hero() {
  const targetDate = new Date('2026-06-11T00:00:00');
  const { days, hours, minutes, seconds } = useCountdown(targetDate);
  const trophyRef = useRef<HTMLImageElement>(null);

  // Trophy float animation
  useEffect(() => {
    if (!trophyRef.current) return;
    let start: number | null = null;
    const duration = 4000;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = (elapsed % duration) / duration;
      const y = Math.sin(progress * Math.PI * 2) * 8;
      if (trophyRef.current) {
        trophyRef.current.style.transform = `translateY(${y}px)`;
      }
      requestAnimationFrame(animate);
    };

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative w-full min-h-[420px] pt-12 overflow-hidden" style={{
      background: 'linear-gradient(135deg, #D4E157 0%, #9E9D24 100%)'
    }}>
      {/* Curved cream overlay */}
      <div
        className="absolute top-0 right-0 h-full"
        style={{
          width: '55%',
          background: '#FFF9C4',
          clipPath: 'path("M 120 0 Q 80 210 180 420 L 800 420 L 800 0 Z")',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 lg:px-6 py-12 flex items-center">
        {/* Left - Text Content */}
        <div className="flex-1">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-[#1A1A1A] text-white text-[10px] font-bold px-2 py-1 tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
              USA<br />CANADA<br />MEXICO
            </div>
            <span className="font-display font-black text-4xl text-[#1A1A1A]">FIFA</span>
          </div>

          {/* Big 26 */}
          <h1 className="font-display font-black italic text-[120px] lg:text-[140px] leading-none text-[#1A1A1A] -mt-4">
            26
          </h1>

          {/* Title */}
          <h2 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] -mt-4 mb-1">
            FIFA WORLD CUP
          </h2>
          <p className="font-semibold text-base text-[#1A1A1A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
            11 JUNE - 19 JULY
          </p>

          {/* Countdown Timer */}
          <div className="inline-flex items-center gap-4 px-5 py-3 border-2 border-[#1A1A1A] rounded-xl">
            {[
              { value: days, label: 'days' },
              { value: hours, label: 'hours' },
              { value: minutes, label: 'mins' },
              { value: seconds, label: 'secs' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="font-display font-bold text-2xl lg:text-3xl text-[#1A1A1A] min-w-[36px]">
                  {item.value}
                </div>
                <div className="text-[10px] font-semibold text-[#666] uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Trophy */}
        <div className="hidden md:flex flex-1 justify-center items-center">
          <img
            ref={trophyRef}
            src="/images/hero-trophy.png"
            alt="FIFA World Cup Trophy"
            className="w-[260px] lg:w-[300px] h-auto object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      {/* Overlapping title card */}
      <div className="relative z-20 flex justify-center -mb-6">
        <div className="bg-white border border-[#E0E0E0] rounded-2xl px-10 py-4 shadow-sm">
          <h3 className="font-display font-extrabold text-xl lg:text-2xl text-[#1A1A1A] tracking-tight">
            MATCHES & FUTURES
          </h3>
        </div>
      </div>
    </section>
  );
}
