import { IndexerLiveLag } from "@/components/IndexerLiveLag";
import { OpsBanners } from "@/components/OpsBanners";
import { OpsHeader } from "@/components/OpsHeader";
import { OpsLiveBanners } from "@/components/OpsLiveBanners";
import { OpsLiveToolbar } from "@/components/OpsLiveToolbar";
import type { OpsGlobalState } from "@/lib/api";

import { OpsMobileNav } from "./OpsMobileNav";
import { OpsSidebar } from "./OpsSidebar";

export function OpsAppShell({
  children,
  globalState,
  apiError,
}: {
  children: React.ReactNode;
  globalState: OpsGlobalState | null;
  apiError: boolean;
}) {
  return (
    <div className="flex min-h-screen w-full bg-[color:var(--color-secondaryBg)]">
      <OpsSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <OpsMobileNav />
        <OpsHeader globalState={globalState} />
        <IndexerLiveLag indexedBlock={globalState?.indexer.lastIndexedBlock} />
        <OpsLiveToolbar />
        <OpsLiveBanners />
        <OpsBanners globalState={globalState} apiError={apiError} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 xl:px-8">{children}</main>
      </div>
    </div>
  );
}
