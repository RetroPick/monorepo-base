"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@ariadocs/react";

/** Ariadocs hrefs are like `/index`, `/faq`; app routes live under `/docs`. */
function toDocHref(href: string, hasChildNav: boolean): string {
  if (href === "/index") return "/docs";
  const path = hasChildNav ? `${href}/index` : href;
  return `/docs${path}`;
}

function NavList({ items, depth = 0 }: { items: NavItem[]; depth?: number }) {
  const pathname = usePathname();

  return (
    <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-0.5 border-l border-zinc-200 pl-3 dark:border-zinc-700"}>
      {items
        .filter((item) => item.nav)
        .map((item) => {
          const childNavItems = item.items.filter((c) => c.nav);
          const docHref = toDocHref(item.href, childNavItems.length > 0);
          const active =
            pathname === docHref || (docHref !== "/docs" && pathname.startsWith(`${docHref}/`));
          return (
            <li key={item.href}>
              <Link
                href={docHref}
                className={`block rounded-md px-2 py-1 text-sm transition-colors ${
                  active
                    ? "bg-zinc-200/80 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {item.title}
              </Link>
              {childNavItems.length > 0 ? <NavList items={item.items} depth={depth + 1} /> : null}
            </li>
          );
        })}
    </ul>
  );
}

export default function DocsSidebar({ items }: { items: NavItem[] }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white py-8 pl-6 pr-4 dark:border-zinc-800 dark:bg-zinc-950 lg:block">
      <Link href="/docs" className="mb-6 block text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        RetroPick
      </Link>
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-500">Documentation</p>
      <nav aria-label="Documentation">
        <NavList items={items} />
      </nav>
    </aside>
  );
}
