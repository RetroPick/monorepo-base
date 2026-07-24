"use client"

import MotionBootstrap from "@/components/motion/MotionBootstrap"
import Navbar from "@/sections/Navbar"
import WaitlistHero from "@/components/waitlist/WaitlistHero"
import RetroPickIntroSection from "@/sections/RetroPickIntroSection"
import ProcessSection from "@/sections/ProcessSection"
import BenefitsSection from "@/sections/BenefitsSection"
import FAQSection from "@/sections/FAQSection"
import BrandKitSection from "@/sections/BrandKitSection"
import Footer from "@/sections/Footer"

export default function Page() {
  return (
    <div className="min-h-screen bg-rp-bg text-white">
      <MotionBootstrap />
      <Navbar />
      <main>
        <WaitlistHero />
        <RetroPickIntroSection />
        <ProcessSection />
        <BenefitsSection />
        <FAQSection />
        <BrandKitSection />
      </main>
      <Footer />
    </div>
  )
}
