import { MarketsAppShell } from "../components/shell/MarketsAppShell";
import { DataStateEmpty } from "../components/DataState";

export function WalletProfilePage() {
  return (
    <MarketsAppShell title="Wallet" hideBottomNav>
      <DataStateEmpty
        title="Wallet profiles unavailable"
        description="A BFF-backed wallet-profile contract is required before this surface can show wallet metrics, follows, or backtests."
      />
    </MarketsAppShell>
  );
}

export default WalletProfilePage;