import { useWorldCupGroups } from "../hooks/useWorldCupGroups";
import WorldCupGroupCard from "./WorldCupGroupCard";
import { WorldCupEmptyState } from "./WorldCupEmptyState";

export default function WorldCupGroupExplorer() {
  const groupsQ = useWorldCupGroups();

  if (groupsQ.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading groups…</p>;
  }

  const groups = groupsQ.data ?? [];
  if (groups.length === 0) {
    return (
      <WorldCupEmptyState
        title="No group markets indexed yet"
        description="World Cup progression markets appear here when templates are published with vertical world_cup or slug prefix world-cup-."
      />
    );
  }

  const left = groups.slice(0, Math.ceil(groups.length / 2));
  const right = groups.slice(Math.ceil(groups.length / 2));

  return (
    <section data-testid="world-cup-group-explorer">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Group explorer</h2>
        <p className="text-sm text-muted-foreground">Teams and progression markets by group.</p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {left.map((group) => (
            <WorldCupGroupCard key={group.letter} group={group} />
          ))}
        </div>
        <div className="hidden flex-col items-center justify-center px-4 lg:flex">
          <div className="flex size-28 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-4xl">
            🏆
          </div>
          <span className="mt-2 text-sm font-bold uppercase tracking-wide text-foreground">FIFA 2026</span>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          {right.map((group) => (
            <WorldCupGroupCard key={group.letter} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}
