import { useLenis } from '../hooks/useLenis';
import Navigation from '../sections/Navigation';
import HeroSection from '../sections/HeroSection';
import RetroPickIntroSection from '../sections/RetroPickIntroSection';
import MarketSection from '../sections/MarketSection';
import ProcessSection from '../sections/ProcessSection';
import RewardsSection from '../sections/RewardsSection';
import FAQSection from '../sections/FAQSection';
import BrandKitSection from '../sections/BrandKitSection';
import Footer from '../sections/Footer';

export default function Home() {
  useLenis();

  return (
    <main className="relative">
      <Navigation />
      <HeroSection />
      <RetroPickIntroSection />
      <MarketSection />
      <ProcessSection />
      <RewardsSection />
      <FAQSection />
      <BrandKitSection />
      <Footer />
    </main>
  );
}
