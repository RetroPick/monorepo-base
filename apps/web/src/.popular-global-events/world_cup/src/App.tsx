import Navbar from './sections/Navbar';
import Hero from './sections/Hero';
import MatchPredictions from './sections/MatchPredictions';
import StageTabs from './sections/StageTabs';
import GroupExplorer from './sections/GroupExplorer';
import AwardsSpecials from './sections/AwardsSpecials';
import Champions from './sections/Champions';
import WeAre26 from './sections/WeAre26';
import Footer from './sections/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <MatchPredictions />
      <StageTabs />
      <GroupExplorer />
      <AwardsSpecials />
      <Champions />
      <WeAre26 />
      <Footer />
    </div>
  );
}
