import { useState, useEffect, useRef } from 'react';
import { ChevronDown, MessageCircle, Send } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [navProgress, setNavProgress] = useState(0);
  const [communityOpen, setCommunityOpen] = useState(false);
  const communityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId = 0;

    const updateScrollState = () => {
      const heroExitStart = window.innerHeight * 0.55;
      const heroExitEnd = window.innerHeight * 0.82;
      const heroExitRange = Math.max(heroExitEnd - heroExitStart, 1);
      const progress = Math.min(Math.max((window.scrollY - heroExitStart) / heroExitRange, 0), 1);

      setNavProgress((current) => (Math.abs(current - progress) > 0.01 ? progress : current));
      setScrolled(window.scrollY >= heroExitEnd);
      frameId = 0;
    };

    const handleScroll = () => {
      if (frameId !== 0) return;
      frameId = window.requestAnimationFrame(updateScrollState);
    };

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!communityRef.current?.contains(event.target as Node)) {
        setCommunityOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav
      data-scrolled={scrolled}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full px-2 py-1.5 transition-[box-shadow,transform,border-color,background-color,backdrop-filter] duration-300 ${
        scrolled ? 'border-slate-200/60' : 'border-transparent'
      }`}
      style={{
        backgroundColor: `rgba(255, 255, 255, ${0.04 + navProgress * 0.9})`,
        borderColor: `rgba(226, 232, 240, ${0.08 + navProgress * 0.58})`,
        backdropFilter: `blur(${8 + navProgress * 14}px)`,
        boxShadow: `0 18px 40px rgba(37, 99, 235, ${0.03 + navProgress * 0.08})`,
      }}
    >
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => scrollTo('hero')}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            scrolled ? 'hover:bg-slate-100' : 'hover:bg-white/10'
          }`}
        >
          <img
            src="/images/retropick-logo.png"
            alt="RetroPick"
            className="w-9 h-9 rounded-full"
          />
        </button>

        <div className={`w-px h-5 ${scrolled ? 'bg-slate-200' : 'bg-white/20'}`} />

        <button
          onClick={() => scrollTo('retropick')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            scrolled
              ? 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          Overview
        </button>

        <button
          onClick={() => scrollTo('benefits')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            scrolled
              ? 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              : 'text-white/80 hover:text-white hover:bg-white/10'
          }`}
        >
          Rewards
        </button>

        <div ref={communityRef} className="relative">
          <button
            type="button"
            onClick={() => setCommunityOpen((open) => !open)}
            aria-expanded={communityOpen}
            aria-haspopup="menu"
            className={`inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-semibold hover:scale-105 active:scale-95 transition-all ${
              scrolled
                ? 'text-white bg-gradient-primary hover:shadow-lg hover:shadow-blue-500/25'
                : 'text-slate-950 bg-white hover:bg-cyan-100'
            }`}
          >
            Join Community!
            <ChevronDown className={`h-4 w-4 transition-transform ${communityOpen ? 'rotate-180' : ''}`} />
          </button>

          {communityOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-white/20 bg-white/95 p-1.5 text-slate-900 shadow-xl shadow-blue-950/10 backdrop-blur-xl"
            >
              <a
                role="menuitem"
                href="https://discord.gg/5EsnWvcErv"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-700"
                onClick={() => setCommunityOpen(false)}
              >
                <MessageCircle className="h-4 w-4" />
                Discord
              </a>
              <a
                role="menuitem"
                href="https://t.me/RetroPickMarket"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-blue-50 hover:text-blue-700"
                onClick={() => setCommunityOpen(false)}
              >
                <Send className="h-4 w-4" />
                Telegram
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
