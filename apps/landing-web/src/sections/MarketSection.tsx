import { useRef, useState } from "react";
import { ensureMotionPlugins, gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion";

export default function MarketSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");
  const prefersReducedMotion = usePrefersReducedMotion();

  ensureMotionPlugins();

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.from(".market-container", {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".market-container",
          start: "top 80%",
        },
      });

      gsap.from(".mascot-float", {
        opacity: 0,
        x: -60,
        duration: 0.8,
        delay: 0.3,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".market-container",
          start: "top 80%",
        },
      });
    },
    {
      scope: sectionRef,
      dependencies: [prefersReducedMotion],
      revertOnUpdate: true,
    }
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`);
  };

  return (
    <section id="market" ref={sectionRef} className="relative w-full bg-rp-bg py-8">
      <div className="relative mx-auto max-w-[1000px] px-5 md:px-10">
        <div
          ref={containerRef}
          className="market-container relative overflow-hidden rounded-2xl bg-rp-dark-blue transition-transform duration-400 ease-out"
          style={{ transform, transformStyle: "preserve-3d" }}
            onMouseMove={prefersReducedMotion ? undefined : handleMouseMove}
            onMouseLeave={() => setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg)")}
        >
          <div className="relative aspect-[16/10]">
            <img
              src="/images/laptop-showcase.png"
              alt="RetroPick prediction market dashboard"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mascot-float absolute bottom-8 left-[-1rem] z-20 animate-float md:left-[-3rem]">
          <img
            src="/images/retropick-logo.png"
            alt="RetroPick"
            className="h-20 w-20 object-contain drop-shadow-lg md:h-28 md:w-28"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
