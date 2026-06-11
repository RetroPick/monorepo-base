import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';

export default function Navigation() {
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!navRef.current) return;
    gsap.set(navRef.current, { opacity: 0 });
    gsap.to(navRef.current, {
      opacity: 1,
      duration: 0.6,
      delay: 1.5,
      ease: 'power2.out',
    });
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      ref={navRef}
      className="fixed top-0 right-0 z-50 p-4 md:p-6 flex items-center gap-3 opacity-0"
    >
      <button
        type="button"
        onClick={() => scrollTo('process')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#333] bg-[rgba(20,20,20,0.8)] backdrop-blur-sm text-white text-sm font-semibold transition-all duration-300 hover:border-rp-blue-bright hover:-translate-y-px"
      >
        <span className="grid grid-cols-2 gap-px w-3.5 h-3.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rp-text-muted" />
          <span className="w-1.5 h-1.5 rounded-full bg-rp-text-muted" />
          <span className="w-1.5 h-1.5 rounded-full bg-rp-text-muted" />
          <span className="w-1.5 h-1.5 rounded-full bg-rp-text-muted" />
        </span>
        <span>PROCESS</span>
      </button>
      <a
        href="https://t.me/RetroPickMarket"
        target="_blank"
        rel="noreferrer"
        className="px-5 py-2.5 rounded-lg border border-[#333] bg-[rgba(20,20,20,0.8)] backdrop-blur-sm text-white text-sm font-semibold transition-all duration-300 hover:border-rp-blue-bright hover:-translate-y-px"
      >
        JOIN COMMUNITY
      </a>
    </nav>
  );
}
