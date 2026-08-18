import Link from "next/link";

import DocsSidebar from "@/components/DocsSidebar";
import { docs } from "@/lib/ariadocs";

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const navItems = await docs.getNavItems();

  return (
    <div className="flex min-h-screen">
      <DocsSidebar items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link href="/docs" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              RetroPick Docs
            </Link>
            <span className="text-xs text-zinc-500">Use desktop for full nav</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
