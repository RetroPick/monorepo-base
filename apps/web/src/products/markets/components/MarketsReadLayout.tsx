import type { ReactNode } from "react";

export { MarketsShellLayout as MarketsReadLayout } from "./MarketsShellLayout";

/** @deprecated Use MarketsShellLayout */
export function LegacyMarketsReadLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
