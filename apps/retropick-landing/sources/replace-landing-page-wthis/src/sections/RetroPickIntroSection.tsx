import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LogoMark } from '../components/Logo';
import BackerBadge from '../components/BackerBadge';

gsap.registerPlugin(ScrollTrigger);

export default function RetroPickIntroSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.retropick-logo', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.retropick-logo',
          start: 'top 85%',
        },
      });

      gsap.from('.retropick-heading', {
        opacity: 0,
        y: 30,
        duration: 0.6,
        delay: 0.1,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.retropick-heading',
          start: 'top 85%',
        },
      });

      gsap.from('.retropick-badge', {
        opacity: 0,
        y: 20,
        duration: 0.5,
        delay: 0.2,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.retropick-badge',
          start: 'top 85%',
        },
      });

      gsap.from('.screenshot-container', {
        opacity: 0,
        y: 40,
        scale: 0.95,
        duration: 0.8,
        delay: 0.3,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.screenshot-container',
          start: 'top 80%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="retropick"
      ref={sectionRef}
      className="relative w-full bg-rp-bg pt-24 pb-16"
    >
      <div className="max-w-[800px] mx-auto px-5 md:px-10">
        <div className="retropick-logo flex items-center gap-3">
          <LogoMark size={40} />
          <span className="text-white text-[32px] font-semibold tracking-tight">
            RetroPick
          </span>
        </div>

        <h2 className="retropick-heading mt-4 text-4xl md:text-5xl font-semibold text-white tracking-tight">
          Event markets with rules you can verify<span className="text-rp-blue">.</span>
        </h2>

        <p className="mt-5 text-base md:text-lg text-rp-text-secondary leading-relaxed">
          RetroPick turns crypto, macro, and real-world events into structured market types with source evidence, paper trading, and standardized USDC settlement.
        </p>

        <div className="retropick-badge mt-5">
          <BackerBadge small />
        </div>

        <div
          className="screenshot-container mt-12 rounded-2xl bg-rp-dark-blue overflow-hidden"
          style={{
            boxShadow: 'inset 0 60px 100px -40px rgba(126,184,255,0.08)',
          }}
        >
          <div className="aspect-video">
            <img
              src="/images/laptop-showcase.png"
              alt="RetroPick market interface"
              className="w-full h-full object-cover opacity-90"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
