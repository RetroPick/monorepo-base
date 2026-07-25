import WorldCupGroupExplorer from "../components/WorldCupGroupExplorer";
import WorldCupStageMarkets from "../components/WorldCupStageMarkets";

export default function WorldCupGroupStage() {
  return (
    <div className="flex flex-col gap-10">
      <WorldCupGroupExplorer />
      <WorldCupStageMarkets stage="group-stage" />
    </div>
  );
}
