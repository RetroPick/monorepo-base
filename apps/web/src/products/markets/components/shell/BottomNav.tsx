import { Compass, BarChart3, Briefcase, Zap } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { cn } from "@/shared/lib/utils";

import {
  discoverPath,
  intelligencePath,
  portfolioPath,
} from "../../routes/paths";
import type { MarketsNavTab } from "./types";

const ITEMS: { id: MarketsNavTab; label: string; icon: typeof Compass; href: string }[] = [
  { id: "explore", label: "Explore", icon: Compass, href: `${discoverPath()}?tab=explore` },
  { id: "markets", label: "Markets", icon: BarChart3, href: `${discoverPath()}?tab=markets` },
  { id: "intelligence", label: "Intelligence", icon: Zap, href: intelligencePath() },
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
      className="fixed inset-x-0 bottom-0 z-50 flex h-[92px] items-start justify-around border-t border-border bg-card/98 px-4 pb-6 pt-2.5 shadow-2xl lg:hidden"
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
                "flex h-9 w-16 items-center justify-center rounded-2xl transition-all duration-200",
                isActive
                  ? "border border-primary/25 bg-primary/20 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} aria-hidden />
            </div>
            <span
              className={cn(
                "text-[11px] transition-colors",
                isActive ? "font-extrabold tracking-tight text-foreground" : "font-semibold text-muted-foreground",
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
