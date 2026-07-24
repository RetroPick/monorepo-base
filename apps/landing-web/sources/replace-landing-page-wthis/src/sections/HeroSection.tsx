import { useEffect, useRef, useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Logo from '../components/Logo';
import { useHeroCanvas } from '../hooks/useHeroCanvas';

gsap.registerPlugin(ScrollTrigger);

const rotatingWords = [
  'No disputes',
  'No Human judges',
  'deterministic',
  'hedging',
  'markets',
  'onchain',
  'instant',
  'settlement',
  'frictionless',
  'trustless',
  'profitable',
];

const longestRotatingWord = rotatingWords.reduce((longest, word) =>
  word.length > longest.length ? word : longest
);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const currentWord = rotatingWords[wordIndex];

  useHeroCanvas(canvasRef);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.from('.hero-reveal', {
        opacity: 0,
        y: 28,
        duration: 0.75,
        stagger: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        onUpdate: (self) => {
          if (contentRef.current) {
            gsap.to(contentRef.current, {
              y: self.progress * -120,
              opacity: 1 - self.progress * 1.2,
              duration: 0.1,
              overwrite: true,
            });
          }
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      <div
        ref={contentRef}
        className="relative z-10 flex flex-col items-center text-center px-4 max-w-[760px]"
      >
        <Logo size={92} className="hero-reveal" />
        <p className="hero-reveal mt-6 inline-flex items-center h-[28px] px-3 rounded-full border border-rp-border-blue bg-white/[0.04] text-[13px] font-medium text-rp-text-secondary backdrop-blur-sm">
          Waitlist • Summer 2026
        </p>
        <h1 className="hero-reveal mt-6 text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.04] tracking-tight text-white text-balance">
          <span className="block">Trade Markets</span>
          <span className="relative inline-grid min-w-[14ch] justify-center font-serif italic font-normal text-rp-blue-bright">
            <span className="invisible" aria-hidden="true">
              {longestRotatingWord}
            </span>
            <span key={currentWord} className="absolute inset-0 animate-word-swap whitespace-nowrap">
              {currentWord}
            </span>
          </span>
          <span className="block">That Never Existed Onchain</span>
        </h1>
        <p className="hero-reveal mt-6 max-w-[560px] text-base md:text-lg text-rp-text-secondary leading-relaxed">
          Hedge exposure across deterministic markets in crypto, macro, and real-world events. Source-backed rules, zero dispute windows, and standardized USDC settlement.
        </p>
        <div className="hero-reveal mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#process"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-rp-bg transition hover:-translate-y-px hover:bg-rp-blue-bright"
          >
            Explore Process
          </a>
          <a
            href="https://t.me/RetroPickMarket"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-rp-border-blue bg-rp-card/80 px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:border-rp-blue"
          >
            Join Community
          </a>
        </div>
      </div>
    </section>
  );
}
