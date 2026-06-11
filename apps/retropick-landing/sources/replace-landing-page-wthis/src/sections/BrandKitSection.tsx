import { useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Download } from 'lucide-react';
import SectionTitle from '../components/SectionTitle';
import { LogoMark } from '../components/Logo';

gsap.registerPlugin(ScrollTrigger);

const logoVariations = [
  { type: 'horizontal', bg: 'white', text: 'black', label: 'Wordmark' },
  { type: 'stacked', bg: 'white', text: 'black', label: 'Stacked' },
  { type: 'icon', bg: 'white', text: 'black', label: 'Icon' },
  { type: 'horizontal', bg: 'dark', text: 'white', label: 'Dark Wordmark' },
  { type: 'stacked', bg: 'dark', text: 'white', label: 'Dark Stacked' },
  { type: 'icon', bg: 'dark', text: 'white', label: 'Dark Icon' },
];

function LogoVariation({ type, text }: { type: string; bg: string; text: string }) {
  const textColor = text === 'white' ? 'text-white' : 'text-black';

  if (type === 'horizontal') {
    return (
      <div className={`flex items-center gap-2 ${textColor}`}>
        <LogoMark size={28} />
        <span className="text-lg font-semibold tracking-tight">RetroPick</span>
      </div>
    );
  }

  if (type === 'stacked') {
    return (
      <div className={`flex flex-col items-center gap-1 ${textColor}`}>
        <LogoMark size={28} />
        <span className="text-sm font-medium tracking-tight">RetroPick</span>
      </div>
    );
  }

  return <LogoMark size={36} />;
}

export default function BrandKitSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      gsap.from('.brandkit-title-row', {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.brandkit-title-row',
          start: 'top 85%',
        },
      });

      gsap.from('.brandkit-card', {
        opacity: 0,
        scale: 0.95,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.brandkit-grid',
          start: 'top 85%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="brand" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10">
        <div className="brandkit-title-row flex items-center justify-between mb-10">
          <SectionTitle>Brand Kit</SectionTitle>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#333] bg-rp-card text-white text-sm font-medium transition-all duration-300 hover:border-rp-blue-bright hover:-translate-y-px">
            <Download size={16} />
            Download All
          </button>
        </div>

        <div className="brandkit-grid grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {logoVariations.map((variation, index) => (
            <div
              key={index}
              className={`brandkit-card group relative aspect-[16/10] rounded-xl flex items-center justify-center transition-all duration-300 hover:-translate-y-1 ${
                variation.bg === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
              }`}
            >
              <LogoVariation type={variation.type} bg={variation.bg} text={variation.text} />

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#222] text-white text-xs font-medium hover:bg-[#333] transition-colors">
                  <Download size={12} />
                  PNG
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#222] text-white text-xs font-medium hover:bg-[#333] transition-colors">
                  <Download size={12} />
                  SVG
                </button>
              </div>

              {variation.label && (
                <span className="absolute top-3 right-3 text-[10px] text-rp-text-muted">
                  {variation.label}
                </span>
              )}
            </div>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-rp-border-blue bg-rp-card text-rp-blue font-medium transition-all duration-300 hover:bg-[rgba(126,184,255,0.08)] hover:border-rp-blue">
          <Download size={18} />
          Branding Guideline PDF
        </button>
      </div>
    </section>
  );
}
