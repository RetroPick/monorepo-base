import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { discoverChipActive, discoverChipIdle, discoverChipPill } from "@/lib/ui/discover-chip-styles";

const TABS = [
  { to: "/app/world-cup/group-stage", label: "Group Stage" },
  { to: "/app/world-cup/round-of-32", label: "Round of 32" },
  { to: "/app/world-cup/quarter-final", label: "Quarter Final" },
  { to: "/app/world-cup/winner", label: "World Cup Winner" },
  { to: "/app/world-cup/bracket", label: "Bracket" },
  { to: "/app/world-cup/stats", label: "Stats & Info" },
] as const;

export default function WorldCupTabs() {
  return (
    <nav
      className="w-full min-w-0 overflow-x-auto no-scrollbar"
      aria-label="World Cup sections"
      data-testid="world-cup-tabs"
    >
      <div className="flex min-w-max flex-nowrap items-center gap-2 pb-1">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(discoverChipPill(), isActive ? discoverChipActive : discoverChipIdle)
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
