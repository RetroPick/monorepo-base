import { useRef, useEffect } from 'react';
import ScrollReveal from '../components/ScrollReveal';

interface Ring {
  rx: number;
  ry: number;
  opacity: number;
  speed: number;
}

export default function CommunitySection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringsRef = useRef<Ring[]>([]);
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const section = canvas.parentElement;
      if (!section) return;
      canvas.width = section.offsetWidth;
      canvas.height = section.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    // Initialize rings
    ringsRef.current = [];
    for (let i = 0; i < 8; i++) {
      ringsRef.current.push({
        rx: 60 + i * 50,
        ry: 30 + i * 25,
        opacity: 0.35 - i * 0.04,
        speed: 0.3 + Math.random() * 0.3,
      });
    }

    const animate = (time: number) => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Spawn new ring periodically
      if (time - lastSpawnRef.current > 600) {
        ringsRef.current.unshift({
          rx: 20,
          ry: 10,
          opacity: 0.5,
          speed: 0.4 + Math.random() * 0.2,
        });
        if (ringsRef.current.length > 20) {
          ringsRef.current.pop();
        }
        lastSpawnRef.current = time;
      }

      // Draw and update rings
      ringsRef.current.forEach((ring) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(127, 255, 212, ${ring.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Expand
        ring.rx += ring.speed * 1.5;
        ring.ry += ring.speed * 0.75;
        ring.opacity -= 0.001;
      });

      // Remove faded rings
      ringsRef.current = ringsRef.current.filter((r) => r.opacity > 0);

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className="relative bg-rp-pale py-40 md:py-52 overflow-hidden min-h-[600px] flex items-center justify-center">
      {/* Wave rings canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <ScrollReveal>
          <p className="text-sm text-rp-dark mb-4">
            No investors. No paid market makers. No fees to any company.
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <h2 className="font-display text-[clamp(3rem,7vw,6rem)] font-normal text-rp-dark leading-tight">
            Community first.
          </h2>
        </ScrollReveal>
      </div>
    </section>
  );
}
