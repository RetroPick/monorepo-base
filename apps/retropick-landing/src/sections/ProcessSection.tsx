import { useRef } from "react";
import GlowCard from "@/components/source-landing/GlowCard";
import SectionMediaVideo from "@/components/source-landing/SectionMediaVideo";
import SectionTitle from "@/components/source-landing/SectionTitle";
import { gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion";

const steps = [
  {
    number: "01",
    title: "Discover Events",
    description:
      "Explore live crypto, macro, and real-world event markets before they happen.",
    video: "/webm/1_feature.webm",
  },
  {
    number: "02",
    title: "Pick Your Edge",
    description:
      "Choose the market structure that matches your thesis, such as direction, threshold, range, ladder, or cascade.",
    video: "/webm/2_feature.webm",
  },
  {
    number: "03",
    title: "Join & Settle",
    description:
      "Enter the event pool, wait for the market to lock, and settle based on clear resolution rules.",
    video: "/webm/3_feature.webm",
  },
  {
    number: "04",
    title: "Yield & Compound",
    description:
      "Keep assets productive while waiting, then claim, reuse, or compound after the event resolves.",
    video: "/webm/4_feature.webm",
  },
];

export default function ProcessSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.from(".process-title", {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".process-title",
          start: "top 85%",
        },
      });

      gsap.from(".process-card", {
        opacity: 0,
        y: 80,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".process-cards",
          start: "top 75%",
        },
      });
    },
    {
      scope: sectionRef,
      dependencies: [prefersReducedMotion],
      revertOnUpdate: true,
    }
  );

  return (
    <section id="process" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="process-title mb-12 md:mb-16">
          <SectionTitle>The process</SectionTitle>
        </div>

        <div className="process-cards grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <GlowCard key={step.number} className="process-card flex min-h-[420px] flex-col">
              <div className="mb-6 flex min-h-[200px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-rp-dark-blue/70">
                <SectionMediaVideo
                  src={step.video}
                  title={step.title}
                  className="h-[200px] w-full object-cover"
                />
              </div>

              <div className="mt-auto">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-rp-blue">{step.number}</span>
                  <h3 className="text-xl font-semibold text-white md:text-2xl">{step.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-rp-text-secondary">{step.description}</p>
              </div>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
