import { useRef, useLayoutEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MarketSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.market-container', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.market-container',
          start: 'top 80%',
        },
      });

      gsap.from('.mascot-float', {
        opacity: 0,
        x: -60,
        duration: 0.8,
        delay: 0.3,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '.market-container',
          start: 'top 80%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`);
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  };

  return (
    <section id="market" ref={sectionRef} className="relative w-full bg-rp-bg py-8">
      <div className="max-w-[1000px] mx-auto px-5 md:px-10 relative">
        <div
          ref={containerRef}
          className="market-container relative rounded-2xl bg-rp-dark-blue overflow-hidden transition-transform duration-400 ease-out"
          style={{ transform, transformStyle: 'preserve-3d' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="aspect-[16/10] relative">
            <img
              src="/images/laptop-showcase.png"
              alt="RetroPick prediction market dashboard"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mascot-float absolute -left-4 md:-left-12 bottom-8 z-20 animate-float">
          <img
            src="/images/retropick-logo.png"
            alt="RetroPick"
            className="w-20 h-20 md:w-28 md:h-28 object-contain drop-shadow-lg"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
