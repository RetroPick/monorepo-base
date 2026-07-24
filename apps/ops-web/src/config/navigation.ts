import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Eye,
  Gauge,
  Hammer,
  LayoutDashboard,
  Radio,
  Rocket,
  Scale,
  Terminal,
} from "lucide-react";

export type OpsNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export const OPS_NAV_MAIN: OpsNavItem[] = [
  { href: "/", label: "Overview", Icon: LayoutDashboard },
  { href: "/monitor", label: "Monitor", Icon: BarChart3 },
  { href: "/templates", label: "Markets", Icon: Gauge },
  { href: "/launch", label: "Lifecycle", Icon: Rocket },
  { href: "/prepare", label: "Transactions", Icon: Hammer },
  { href: "/keeper", label: "Keeper", Icon: Activity },
  { href: "/oracle", label: "Oracles & feeds", Icon: Radio },
  { href: "/incidents", label: "Incidents", Icon: AlertTriangle },
  { href: "/visibility", label: "Visibility", Icon: Eye },
  { href: "/governance", label: "Governance", Icon: Scale },
  { href: "/retrodeployer", label: "RETRODEPLOYER", Icon: Terminal },
];
