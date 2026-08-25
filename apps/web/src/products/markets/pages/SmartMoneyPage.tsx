import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";

export function SmartMoneyPage() {
  return (
    <MarketsAppShell title="Smart Money">
      <DataStateEmpty
        title="Smart Money unavailable"
        description="A BFF-backed leaderboard contract is required before this surface can show wallet metrics or rankings."
      />
    </MarketsAppShell>
  );
}

export default SmartMoneyPage;