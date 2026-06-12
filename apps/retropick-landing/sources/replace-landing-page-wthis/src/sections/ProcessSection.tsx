import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionTitle from '../components/SectionTitle';
import GlowCard from '../components/GlowCard';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Discover Events',
    description:
      'Browse upcoming, active, and resolved crypto or macro events. Find structured markets instead of scattered headlines.',
    image: '/images/market-types.jpg',
  },
  {
    number: '02',
    title: 'Paper Trade First',
    description:
      'Simulate positions and learn market formats without real settlement. Build confidence before committing real funds.',
    image: '/images/paper-trading.jpg',
  },
  {
    number: '03',
    title: 'Verify & Claim',
    description:
      'Every resolution shows the source, value, timestamp, and rule. Review the evidence and claim with transparency.',
    image: '/images/source-evidence.jpg',
  },
];

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Section title
      gsap.from('.process-title', {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.process-title',
          start: 'top 85%',
        },
      });

      // Cards stagger
      gsap.from('.process-card', {
        opacity: 0,
        y: 80,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.process-cards',
          start: 'top 75%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="process" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10">
        <div className="process-title mb-12 md:mb-16">
          <SectionTitle>The process</SectionTitle>
        </div>

        <div className="process-cards grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step) => (
            <GlowCard key={step.number} className="process-card">
              <div className="mb-6 aspect-square w-full overflow-hidden rounded-xl bg-rp-dark-blue/70">
                <img
                  src={step.image}
                  alt={step.title}
                  className="h-full w-full object-cover rounded-lg"
                  loading="lazy"
                />
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-rp-blue">{step.number}</span>
                  <h3 className="text-2xl font-semibold text-white mb-2">{step.title}</h3>
                </div>
                <p className="text-sm text-rp-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
