import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ScrollReveal from '../components/ScrollReveal';

gsap.registerPlugin(ScrollTrigger);

const hypercoreBlocks = [
  { name: 'Oracles', height: 50, highlight: false },
  { name: 'Spot', height: 55, highlight: true },
  { name: 'Perps', height: 65, highlight: true },
  { name: 'Borrowing', height: 70, highlight: false },
  { name: 'Auctions', height: 45, highlight: false },
];

const hyperevmBlocks = [
  { name: 'Vaults', height: 55, highlight: false },
  { name: 'Governance', height: 65, highlight: false },
  { name: 'Stablecoins', height: 60, highlight: false },
  { name: 'Bridges', height: 50, highlight: false },
  { name: 'More Apps', height: 75, highlight: false },
];

export default function StackSection() {
  const diagramRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!diagramRef.current) return;

    const blocks = diagramRef.current.querySelectorAll('.stack-block');

    gsap.from(blocks, {
      y: 30,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: diagramRef.current,
        start: 'top 75%',
        toggleActions: 'play none none none',
      },
    });
  }, { scope: diagramRef });

  return (
    <section className="relative bg-rp-deep py-24 md:py-32 overflow-hidden">
      <div className="container-rp">
        {/* Title */}
        <ScrollReveal>
          <h2 className="section-title text-center mb-16 md:mb-24">
            The <em>RetroPick</em> Stack
          </h2>
        </ScrollReveal>

        {/* Diagram + Text */}
        <div className="relative" ref={diagramRef}>
          {/* Text blocks */}
          <div className="hidden lg:block">
            {/* Top-left text */}
            <ScrollReveal className="absolute top-0 left-0 max-w-[260px] z-10">
              <p className="text-[13px] text-white/80 leading-relaxed">
                Perps and spot order books are two flagship applications built on
                RetroCore. But they are{' '}
                <span className="text-rp-mint font-medium">just the tip of the iceberg.</span>
              </p>
              <div className="mt-2 w-12 h-[1px] bg-rp-mint/40" />
            </ScrollReveal>

            {/* Top-right text */}
            <ScrollReveal delay={0.2} className="absolute top-0 right-0 max-w-[280px] z-10">
              <p className="text-[13px] text-white/80 leading-relaxed">
                High performance applications are built natively. These financial
                primitives on RetroCore are accessible to user-built applications
                on the general-purpose RetroEVM, which supports familiar Ethereum
                tooling. The RetroEVM and RetroCore exist as one unified state,
                unlocking applications that simultaneously require performance,
                liquidity, and programmability.
              </p>
              <div className="mt-2 w-12 h-[1px] bg-rp-mint/40 ml-auto" />
            </ScrollReveal>

            {/* Bottom-left text */}
            <ScrollReveal delay={0.3} className="absolute bottom-0 left-0 max-w-[260px] z-10">
              <div className="mb-2 w-12 h-[1px] bg-rp-mint/40" />
              <p className="text-[13px] text-white/80 leading-relaxed">
                User-built applications on the RetroEVM interact seamlessly with
                RetroCore to let anyone use apps, launch tokens, and trade, all in
                one place.
              </p>
            </ScrollReveal>

            {/* Bottom-right text */}
            <ScrollReveal delay={0.4} className="absolute bottom-0 right-0 max-w-[280px] z-10">
              <div className="mb-2 w-12 h-[1px] bg-rp-mint/40 ml-auto" />
              <p className="text-[13px] text-white/80 leading-relaxed">
                The foundation of the RetroPick blockchain is RetroBFT consensus,
                which lets a disparate set of nodes agree on the state of the
                world. The state comprises all applications, both those built on
                RetroCore and the RetroEVM.
              </p>
            </ScrollReveal>
          </div>

          {/* Isometric Diagram */}
          <div className="flex justify-center items-center py-12 lg:py-20 perspective-1200">
            <div
              className="relative preserve-3d"
              style={{
                transform: 'rotateX(55deg) rotateZ(-35deg)',
                width: '500px',
                height: '320px',
              }}
            >
              {/* Base Platform - RetroCore */}
              <div
                className="absolute preserve-3d"
                style={{
                  width: '220px',
                  height: '280px',
                  left: '20px',
                  top: '20px',
                  background: 'rgba(127,255,212,0.08)',
                  border: '1px solid rgba(127,255,212,0.25)',
                  transform: 'translateZ(0)',
                }}
              >
                <span
                  className="absolute text-[10px] text-white/40 font-medium tracking-wider uppercase"
                  style={{ bottom: '4px', right: '8px' }}
                >
                  RetroCore
                </span>
              </div>

              {/* Base Platform - RetroEVM */}
              <div
                className="absolute preserve-3d"
                style={{
                  width: '220px',
                  height: '280px',
                  left: '260px',
                  top: '20px',
                  background: 'rgba(127,255,212,0.05)',
                  border: '1px solid rgba(127,255,212,0.18)',
                  transform: 'translateZ(0)',
                }}
              >
                <span
                  className="absolute text-[10px] text-white/40 font-medium tracking-wider uppercase"
                  style={{ bottom: '4px', right: '8px' }}
                >
                  RetroEVM
                </span>
              </div>

              {/* RetroCore Blocks */}
              {hypercoreBlocks.map((block, i) => (
                <div
                  key={block.name}
                  className="stack-block absolute preserve-3d flex items-end justify-center"
                  style={{
                    width: '30px',
                    left: `${40 + i * 38}px`,
                    top: `${40 + i * 12}px`,
                    height: `${block.height}px`,
                    background: block.highlight
                      ? 'rgba(127,255,212,0.45)'
                      : 'rgba(127,255,212,0.18)',
                    border: `1px solid ${block.highlight ? 'rgba(127,255,212,0.6)' : 'rgba(127,255,212,0.3)'}`,
                    transform: `translateZ(${block.height / 2}px)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <span
                    className="text-[8px] text-white/80 font-medium whitespace-nowrap"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      padding: '4px 0',
                    }}
                  >
                    {block.name}
                  </span>
                </div>
              ))}

              {/* RetroEVM Blocks */}
              {hyperevmBlocks.map((block, i) => (
                <div
                  key={block.name}
                  className="stack-block absolute preserve-3d flex items-end justify-center"
                  style={{
                    width: '30px',
                    left: `${280 + i * 38}px`,
                    top: `${40 + i * 8}px`,
                    height: `${block.height}px`,
                    background: 'rgba(127,255,212,0.15)',
                    border: '1px solid rgba(127,255,212,0.28)',
                    transform: `translateZ(${block.height / 2}px)`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <span
                    className="text-[8px] text-white/80 font-medium whitespace-nowrap"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      padding: '4px 0',
                    }}
                  >
                    {block.name}
                  </span>
                </div>
              ))}

              {/* Connection lines */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  width: '500px',
                  height: '320px',
                  left: 0,
                  top: 0,
                }}
              >
                <line
                  x1="120"
                  y1="80"
                  x2="0"
                  y2="0"
                  stroke="rgba(127,255,212,0.3)"
                  strokeWidth="1"
                />
                <line
                  x1="380"
                  y1="80"
                  x2="500"
                  y2="0"
                  stroke="rgba(127,255,212,0.3)"
                  strokeWidth="1"
                />
                <line
                  x1="120"
                  y1="280"
                  x2="0"
                  y2="320"
                  stroke="rgba(127,255,212,0.3)"
                  strokeWidth="1"
                />
                <line
                  x1="380"
                  y1="280"
                  x2="500"
                  y2="320"
                  stroke="rgba(127,255,212,0.3)"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
