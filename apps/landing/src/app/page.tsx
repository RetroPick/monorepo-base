import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { HeroSection } from "@/components/landing/HeroSection";
import LandingAnimations from "@/components/landing/LandingAnimations";
import { StepsSection } from "@/components/landing/StepsSection";

export default function HomePage() {
  return (
    <>
      <main className="relative">
        <div className="grain-overlay" />
        <HeroSection />
        <StepsSection />
        <FeaturesSection />
        <BenefitsSection />
        <CtaSection />
        <FinalCtaSection />
      </main>
      <LandingAnimations />
    </>
  );
}
