import WorldCupMatchesAndFutures from "../components/WorldCupMatchesAndFutures";
import WorldCupStatsInfo from "../components/WorldCupStatsInfo";
import WorldCupAwardsSpecials from "../components/WorldCupAwardsSpecials";

export default function WorldCupStatsInfoPage() {
  return (
    <div className="flex flex-col gap-12">
      <WorldCupMatchesAndFutures />
      <WorldCupStatsInfo />
      <WorldCupAwardsSpecials />
    </div>
  );
}
