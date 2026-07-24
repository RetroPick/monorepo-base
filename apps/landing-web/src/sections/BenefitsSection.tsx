import { useRef } from "react";
import GlowCard from "@/components/source-landing/GlowCard";
import SectionMediaVideo from "@/components/source-landing/SectionMediaVideo";
import SectionTitle from "@/components/source-landing/SectionTitle";
import { gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion";

const rewards = [
  {
    number: "01",
    title: "Trading Competitions",
    description:
      "Share your portfolio, climb the leaderboard, and win seasonal rewards.",
    video: "/webm/3_process.webm",
  },
  {
    number: "02",
    title: "Referral Rewards",
    description:
      "Invite people to become Retromax users and earn rewards as they deposit and stay active.",
    video: "/webm/2_process.webm",
    videoClassName: "object-right",
  },
  {
    number: "03",
    title: "Badge Rewards",
    description:
      "Collect badges to show your status, activity, and reputation as a Retro G.",
    video: "/webm/4_process.webm",
  },
  {
    number: "04",
    title: "Yield on Deposits",
    description:
      "Earn yield on deposited assets and compound over time. Everyone gains G.",
    video: "/webm/1_process.webm",
  },
];

export default function BenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.from(".benefits-title", {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".benefits-title",
          start: "top 85%",
        },
      });

      gsap.from(".benefits-card", {
        opacity: 0,
        y: 60,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".benefits-grid",
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

  return (
    <section id="benefits" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="benefits-title mb-12 md:mb-16">
          <SectionTitle>The rewards</SectionTitle>
        </div>

        <div className="benefits-grid grid grid-cols-1 gap-6 md:grid-cols-2">
          {rewards.map((reward) => (
            <GlowCard key={reward.title} className="benefits-card">
              <div className="mb-6 aspect-square w-full overflow-hidden rounded-xl bg-rp-dark-blue/70">
                <SectionMediaVideo
                  src={reward.video}
                  title={reward.title}
                  className={`h-full w-full object-cover ${reward.videoClassName ?? ""}`}
                />
              </div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-rp-blue">{reward.number}</span>
                <h3 className="text-2xl font-semibold text-white">{reward.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-rp-text-secondary">{reward.description}</p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
