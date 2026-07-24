import { groups } from '../data/groups';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function FlagIcon({ code }: { code: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={code}
      className="w-4 h-3 object-cover rounded-sm"
      loading="lazy"
    />
  );
}

export default function GroupExplorer() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const leftGroups = groups.slice(0, 6);
  const rightGroups = groups.slice(6, 12);

  useEffect(() => {
    if (!sectionRef.current) return;
    const cards = sectionRef.current.querySelectorAll('.group-card');
    
    gsap.fromTo(
      cards,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power2.out',
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

  const GroupCard = ({ group }: { group: typeof groups[0] }) => (
    <div className="group-card bg-white rounded-xl border border-[#E0E0E0] p-3">
      <div className="flex items-start gap-3">
        <span className="font-display font-extrabold text-lg text-[#1A1A1A] w-6">
          {group.letter}
        </span>
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {group.teams.map((team) => (
            <div key={team.code} className="flex items-center gap-1.5">
              <FlagIcon code={team.code} />
              <span className="text-[12px] font-semibold text-[#1A1A1A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {team.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <section ref={sectionRef} className="bg-[#F5F5F5] px-4 lg:px-6 pb-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Groups (A-F) */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {leftGroups.map((group) => (
              <GroupCard key={group.letter} group={group} />
            ))}
          </div>

          {/* Center Trophy */}
          <div className="hidden lg:flex flex-col items-center justify-center self-center px-4">
            <img
              src="/images/hero-trophy.png"
              alt="FIFA World Cup Trophy"
              className="w-[140px] h-auto object-contain"
            />
            <span className="font-display font-extrabold text-xl text-[#1A1A1A] mt-2">FIFA</span>
          </div>

          {/* Right Groups (G-L) */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            {rightGroups.map((group) => (
              <GroupCard key={group.letter} group={group} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
