"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { OPS_NAV_MAIN } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function OpsMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="border-b border-[color:var(--color-mainBorder)] bg-[color:var(--color-navigationBg)] lg:hidden">
      <div className="flex h-12 items-center justify-between px-3">
        <Link href="/" className="font-semibold text-[color:var(--color-logoBasicText)]">
          RetroPick Ops
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label="Open navigation"
          className="rounded-lg border border-[color:var(--color-mainBorder)] p-2 text-[color:var(--color-primaryText)]"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-[color:var(--color-mainBorder)] p-2 pb-3">
          {OPS_NAV_MAIN.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  active
                    ? "bg-[color:var(--color-navItemActiveBg)] text-[color:var(--color-navItemTextActive)]"
                    : "text-[color:var(--color-navItemText)]",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
