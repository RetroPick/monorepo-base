import { useState, useEffect, useRef } from 'react';
import { awardCategories } from '../data/awards';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function AwardsSpecials() {
  const [activeTab, setActiveTab] = useState<'awards' | 'futures'>('awards');
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll('.award-card');

    gsap.fromTo(
      cards,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          once: true,
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="bg-[#F5F5F5] px-4 lg:px-6 py-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-[#1A1A1A] text-center mb-6">
          AWARDS & SPECIALS
        </h2>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-white rounded-full p-1 border border-[#E0E0E0]">
            <button
              onClick={() => setActiveTab('awards')}
              className={`px-5 py-2 text-[13px] font-semibold rounded-full transition-all ${
                activeTab === 'awards'
                  ? 'bg-[#33691E] text-white'
                  : 'text-[#666] hover:text-[#1A1A1A]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Awards
            </button>
            <button
              onClick={() => setActiveTab('futures')}
              className={`px-5 py-2 text-[13px] font-semibold rounded-full transition-all ${
                activeTab === 'futures'
                  ? 'bg-[#33691E] text-white'
                  : 'text-[#666] hover:text-[#1A1A1A]'
              }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Futures
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[12px] text-[#666]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span>World Cup Prediction on</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-[#1A1A1A] rounded-sm flex items-center justify-center">
                <div className="w-2 h-2 border-2 border-white rounded-full" />
              </div>
              <span className="font-bold text-[#1A1A1A]">OPINION</span>
            </div>
          </div>
        </div>

        {/* Award Categories */}
        {activeTab === 'awards' && (
          <div className="space-y-4">
            {awardCategories.map((category, idx) => (
              <div
                key={idx}
                className="award-card bg-white rounded-2xl border border-[#E0E0E0] p-5 lg:p-6"
              >
                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Graphic */}
                  <div className="flex-shrink-0">
                    <img
                      src={category.graphic}
                      alt={category.title}
                      className="w-[120px] h-[120px] lg:w-[150px] lg:h-[150px] rounded-xl object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm lg:text-base text-[#1A1A1A] mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {category.title}
                    </h3>

                    {/* Player Cards */}
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {category.players.map((player, pidx) => (
                        <div key={pidx} className="flex flex-col items-center min-w-[70px]">
                          <span className="font-display font-bold text-sm text-[#1A1A1A] mb-1">
                            {player.percent}%
                          </span>
                          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden bg-[#F5F5F5]">
                            <img
                              src={player.image}
                              alt={player.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#1A1A1A] mt-1.5 text-center leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {player.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'futures' && (
          <div className="bg-white rounded-2xl border border-[#E0E0E0] p-8 text-center">
            <p className="text-[#666] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Futures markets coming soon. Stay tuned for more prediction markets!
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
