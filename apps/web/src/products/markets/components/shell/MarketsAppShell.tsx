import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import type { DiscoveryVerticalId } from "@/shared/lib/discovery-verticals";

import { AlertsDrawer } from "./AlertsDrawer";
import { BottomNav } from "./BottomNav";
import { DrawerMenu } from "./DrawerMenu";
import { MarketsTopBar } from "./MarketsTopBar";
import { navTabFromPath } from "./types";

export interface MarketsAppShellProps {
  children: ReactNode;
  title?: string;
  hideBottomNav?: boolean;
  onCategorySelect?: (id: DiscoveryVerticalId) => void;
}

export function MarketsAppShell({
  children,
  title,
  hideBottomNav = false,
  onCategorySelect,
}: MarketsAppShellProps) {
  const location = useLocation();
  const activeTab = navTabFromPath(location.pathname, location.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const isDetailRoute =
    location.pathname.includes("/markets/m/") || location.pathname.includes("/markets/events/");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketsTopBar
        title={title}
        activeTab={activeTab}
        onMenuOpen={() => setDrawerOpen(true)}
        onAlertsOpen={() => setAlertsOpen(true)}
      />
      <main className="mx-auto max-w-screen-2xl px-4 pb-28 pt-6 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      {!hideBottomNav && !isDetailRoute ? <BottomNav active={activeTab} /> : null}
      <DrawerMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onCategorySelect={onCategorySelect}
      />
      <AlertsDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
}
