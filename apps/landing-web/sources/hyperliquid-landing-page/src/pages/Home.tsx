import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar from '../sections/Navbar';
import HeroSection from '../sections/HeroSection';
import DexShowcaseSection from '../sections/DexShowcaseSection';
import StackSection from '../sections/StackSection';
import StatsBarSection from '../sections/StatsBarSection';
import CommunitySection from '../sections/CommunitySection';
import TokenSection from '../sections/TokenSection';
import GiantWordmarkSection from '../sections/GiantWordmarkSection';
import Footer from '../sections/Footer';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  return (
    <div className="relative">
      <Navbar />
      <HeroSection />
      <DexShowcaseSection />
      <StackSection />
      <StatsBarSection />
      <CommunitySection />
      <TokenSection />
      <GiantWordmarkSection />
      <Footer />
    </div>
  );
}
