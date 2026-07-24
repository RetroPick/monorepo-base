import { useRef } from "react";
import FAQItem from "@/components/source-landing/FAQItem";
import SectionTitle from "@/components/source-landing/SectionTitle";
import { gsap, useGSAP, usePrefersReducedMotion } from "@/lib/motion";

const faqData = [
  {
    question: "What is RetroPick?",
    answer:
      "RetroPick is an event-risk market platform for crypto, macro, and real-world events. It supports structured market types so participants can express more precise views than basic YES/NO predictions.",
  },
  {
    question: "How are markets resolved?",
    answer:
      "Each market shows its source, observation time, resolution rule, and fallback before participation. Resolution is designed around deterministic evidence instead of human dispute windows.",
  },
  {
    question: "Can I learn before using real funds?",
    answer:
      "Yes. Paper trading lets you simulate positions across market formats without real settlement, so you can understand outcomes and payouts first.",
  },
  {
    question: "What currency do positions settle in?",
    answer:
      "RetroPick standardizes event positions around USDC settlement so claims, payouts, and balances are easier to reason about.",
  },
  {
    question: "Is yield guaranteed?",
    answer:
      "No. Optional yield routing may be available for idle collateral when supported, but yield is variable and never guaranteed.",
  },
];

export default function FAQSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion || !sectionRef.current) return;

      gsap.from(".faq-title", {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".faq-title",
          start: "top 85%",
        },
      });

      gsap.from(".faq-item", {
        opacity: 0,
        x: 30,
        duration: 0.5,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "transform,opacity",
        scrollTrigger: {
          trigger: ".faq-list",
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
    <section id="faq" ref={sectionRef} className="relative w-full bg-rp-bg py-24 md:py-32">
      <div className="mx-auto max-w-[1200px] px-5 md:px-10">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          <div className="faq-title md:sticky md:top-32 md:w-1/3 md:self-start">
            <SectionTitle>FAQ</SectionTitle>
          </div>

          <div className="faq-list flex flex-col gap-3 md:w-2/3">
            {faqData.map((faq) => (
              <div key={faq.question} className="faq-item">
                <FAQItem question={faq.question} answer={faq.answer} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
