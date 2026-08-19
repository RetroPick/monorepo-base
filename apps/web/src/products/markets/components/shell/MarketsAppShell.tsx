import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import type { DiscoveryVerticalId } from "@/shared/lib/discovery-verticals";

import { AlertsDrawer } from "./AlertsDrawer";
import { DrawerMenu } from "./DrawerMenu";
import { MarketsTopBar } from "./MarketsTopBar";
import { navTabFromPath } from "./types";

export interface MarketsAppShellProps {
  children: ReactNode;
  title?: string;
  hideBottomNav?: boolean;
  onCategorySelect?: (id: DiscoveryVerticalId) => void;
  onSearchChange?: (query: string) => void;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export function MarketsAppShell({
  children,
  title,
  onCategorySelect,
  onSearchChange,
  activeCategory,
  onSelectCategory,
}: MarketsAppShellProps) {
  const location = useLocation();
  const activeTab = navTabFromPath(location.pathname, location.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const isDetailRoute =
    location.pathname.includes("/markets/m/") || location.pathname.includes("/markets/events/");

  return (
    <div className="retropick-aurora min-h-screen bg-background text-foreground">
      <MarketsTopBar
        title={title}
        activeTab={activeTab}
        onMenuOpen={() => setDrawerOpen(true)}
        onAlertsOpen={() => setAlertsOpen(true)}
        onSearchChange={onSearchChange}
        activeCategory={activeCategory}
        onSelectCategory={onSelectCategory}
      />
      <main className="mx-auto max-w-[1720px] w-full px-3 sm:px-5 lg:px-6 pb-12 pt-3 lg:pt-4">{children}</main>
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCategorySelect={onCategorySelect}
        onSearchChange={onSearchChange}
      />
      <AlertsDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
}
