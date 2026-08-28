import { Compass, BarChart3, Briefcase, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/shared/lib/utils";
import {
  discoverPath,
  leaderboardPath,
  portfolioPath,
} from "../../routes/paths";
import type { MarketsNavTab } from "./types";

const ITEMS: { id: MarketsNavTab; label: string; icon: typeof Trophy; href: string }[] = [
  { id: "explore", label: "Explore", icon: Compass, href: `${discoverPath()}?tab=explore` },
  { id: "markets", label: "Markets", icon: BarChart3, href: `${discoverPath()}?tab=markets` },
  { id: "intelligence", label: "Leaderboard", icon: Trophy, href: leaderboardPath() },
  { id: "portfolio", label: "Portfolio", icon: Briefcase, href: portfolioPath() },
];

function toLinkTarget(href: string): { pathname: string; search: string } {
  const [pathname, rawSearch = ""] = href.split("?", 2);
  return {
    pathname,
    search: rawSearch === "" ? "" : `?${rawSearch}`,
  };
}

interface BottomNavProps {
  active: MarketsNavTab;
}

export function BottomNav({ active }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex h-20 items-center justify-around border-t border-white/10 bg-[#0E131F]/95 backdrop-blur-xl px-4 pb-2 pt-2 shadow-2xl shadow-black lg:hidden"
      aria-label="Primary navigation"
    >
      {ITEMS.map(({ id, label, icon: Icon, href }) => {
        const isActive = active === id;
        const target = toLinkTarget(href);
        return (
          <Link
            key={id}
            to={target}
            state={{ from: location.pathname }}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-all active:scale-95"
            aria-current={isActive ? "page" : undefined}
          >
            <div
              className={cn(
                "flex h-9 w-14 items-center justify-center rounded-xl transition-all duration-200",
                isActive
                  ? "border border-primary/40 bg-primary/20 text-primary shadow-lg shadow-primary/20"
                  : "text-slate-400 hover:text-white",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} aria-hidden />
            </div>
            <span
              className={cn(
                "text-[10px] transition-colors",
                isActive ? "font-extrabold text-white" : "font-semibold text-slate-400",
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
