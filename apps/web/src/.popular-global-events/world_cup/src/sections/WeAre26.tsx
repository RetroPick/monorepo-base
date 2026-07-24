import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function WeAre26() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!textRef.current || !sectionRef.current) return;

    gsap.fromTo(
      textRef.current,
      { opacity: 0, y: 60, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          once: true,
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="bg-white px-4 lg:px-6 py-20 lg:py-28 overflow-hidden">
      <h2
        ref={textRef}
        className="font-display font-black text-[60px] sm:text-[80px] md:text-[100px] lg:text-[120px] text-[#1A1A1A] text-center uppercase leading-none tracking-tight"
      >
        WE ARE <span className="italic">26</span>
      </h2>
    </section>
  );
}
