import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionTitle from '../components/SectionTitle';
import GlowCard from '../components/GlowCard';

gsap.registerPlugin(ScrollTrigger);

const benefits = [
  {
    title: 'Source Evidence',
    description:
      'See the source, observation time, resolve time, and fallback rule before you participate in any market.',
    image: '/images/source-evidence.jpg',
  },
  {
    title: 'Paper Trading',
    description:
      'Learn structured event formats without real settlement, then move to live markets when you are ready.',
    image: '/images/paper-trading.jpg',
  },
  {
    title: 'USDC Settlement',
    description:
      'All event positions settle in one currency so payouts, claims, and outcomes stay easy to understand.',
    image: '/images/usdc-settlement.jpg',
  },
  {
    title: 'Optional Yield Routing',
    description:
      'Idle collateral may be routed into variable yield strategies when supported. Transparent, never guaranteed.',
    image: '/images/phone-showcase.png',
  },
];

export default function RewardsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.rewards-title', {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.rewards-title',
          start: 'top 85%',
        },
      });

      gsap.from('.rewards-card', {
        opacity: 0,
        y: 60,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.rewards-grid',
          start: 'top 80%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="benefits" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10">
        <div className="rewards-title mb-12 md:mb-16">
          <SectionTitle>Product Benefits</SectionTitle>
        </div>

        <div className="rewards-grid grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((benefit) => (
            <GlowCard key={benefit.title} className="rewards-card">
              <div className="flex items-center justify-center mb-6 min-h-[220px] rounded-xl bg-rp-dark-blue/70 overflow-hidden">
                <img
                  src={benefit.image}
                  alt={benefit.title}
                  className="w-full h-[220px] object-cover"
                  loading="lazy"
                />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">{benefit.title}</h3>
              <p className="text-sm text-rp-text-secondary leading-relaxed">
                {benefit.description}
              </p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
