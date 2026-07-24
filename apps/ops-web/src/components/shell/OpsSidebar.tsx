"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OPS_NAV_MAIN } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function OpsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-[color:var(--color-mainBorder)] bg-[color:var(--color-navigationBg)] lg:flex">
      <div className="flex h-16 items-center border-b border-[color:var(--color-mainBorder)] px-4">
        <Link href="/" className="font-semibold text-[color:var(--color-logoBasicText)]">
          RetroPick Ops
        </Link>
      </div>
      <nav aria-label="Operator sections" className="flex flex-1 flex-col gap-0.5 p-2">
        {OPS_NAV_MAIN.map(({ href, label, Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[color:var(--color-navItemActiveBg)] text-[color:var(--color-navItemTextActive)]"
                  : "text-[color:var(--color-navItemText)] hover:bg-[color:var(--color-navItemBgHover)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-[color:var(--color-navItemIconActive)] opacity-80" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[color:var(--color-mainBorder)] p-3 text-[10px] leading-snug text-[color:var(--color-placeholderText)]">
        VPN / SSO recommended for production. Signing stays in CLI or Safe.
      </div>
    </aside>
  );
}
