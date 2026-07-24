import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollReveal from '../components/ScrollReveal';

gsap.registerPlugin(ScrollTrigger);

const letters = 'DECENTRALISED'.split('');

const features = [
  {
    title: 'Low fees',
    description: 'Zero gas and low fees on all orders.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1A3C2B" strokeWidth="1.5">
        <circle cx="24" cy="24" r="18" />
        <circle cx="24" cy="24" r="12" />
        <circle cx="24" cy="24" r="6" />
      </svg>
    ),
  },
  {
    title: 'Up to 40x leverage',
    description: 'Trade with conviction to maximize capital efficiency.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1A3C2B" strokeWidth="1.5">
        <path d="M14 24c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10" />
        <path d="M14 24c0 5.523 4.477 10 10 10" />
        <circle cx="24" cy="24" r="2" fill="#1A3C2B" stroke="none" />
      </svg>
    ),
  },
  {
    title: 'Transparent',
    description: 'Fully onchain order book. Trades, funding, and liquidations all happen on the RetroPick L1.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1A3C2B" strokeWidth="1.5">
        <ellipse cx="24" cy="24" rx="10" ry="10" />
        <circle cx="24" cy="24" r="4" />
        <path d="M24 4v8M24 36v8M4 24h8M36 24h8" />
      </svg>
    ),
  },
  {
    title: 'Seamless',
    description: 'One-click trading. No wallet approvals to interrupt your flow.',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1A3C2B" strokeWidth="1.5">
        <path d="M12 14l12-8 12 8v20l-12 8-12-8V14z" />
        <path d="M24 6v40" />
        <path d="M12 14l12 8 12-8" />
      </svg>
    ),
  },
];

export default function DexShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!imageRef.current || !sectionRef.current) return;

    gsap.fromTo(
      imageRef.current,
      { y: 30 },
      {
        y: -30,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      }
    );
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="relative bg-rp-light py-24 md:py-32 overflow-hidden">
      <div className="container-rp">
        {/* Headline */}
        <ScrollReveal>
          <p className="text-center text-rp-dark text-[clamp(1.1rem,2vw,1.5rem)] leading-relaxed max-w-[700px] mx-auto">
            The flagship application: the premier{' '}
            {letters.map((letter, i) => (
              <span
                key={i}
                className="text-rp-mint font-medium"
                style={{ letterSpacing: '0.25em' }}
              >
                {letter}
              </span>
            ))}{' '}
            exchange
          </p>
        </ScrollReveal>

        {/* DEX Screenshot */}
        <ScrollReveal className="mt-12 md:mt-16">
          <div ref={imageRef} className="max-w-[900px] mx-auto">
            <img
              src="/images/dex-screenshot.jpg"
              alt="RetroPick Trading Interface"
              className="w-full rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            />
          </div>
        </ScrollReveal>

        {/* Feature Cards */}
        <div className="mt-16 md:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 0.1}>
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-display italic text-2xl text-rp-dark mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-rp-dark/70 leading-relaxed max-w-[220px] mx-auto lg:mx-0">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
