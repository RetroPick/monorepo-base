import { MarketsAppShell, type MarketsAppShellProps } from "./shell/MarketsAppShell";

/** @deprecated Use MarketsAppShell — kept for incremental migration. */
export type MarketsShellLayoutProps = MarketsAppShellProps;

export function MarketsShellLayout(props: MarketsShellLayoutProps) {
  return <MarketsAppShell {...props} />;
}

export { MarketsAppShell };
