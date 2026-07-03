import { Link } from "react-router-dom";

export default function DailyMarketPage() {
  return (
    <div className="mx-auto max-w-lg p-4 space-y-4">
      <h1 className="text-2xl font-bold">Daily Market</h1>
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
        Preview UI — on-chain entry is not wired in this release. Explore referral and impact demos from the hub
        instead.
      </p>
      <p className="text-muted-foreground">
        Pick one simple outcome for today. Small G$ stake, plain language, no trading jargon.
      </p>
      <div className="rounded-xl border p-4 space-y-3 opacity-75">
        <p className="font-medium">Will more people use G$ on RetroPick this week?</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg bg-muted text-muted-foreground py-2 cursor-not-allowed"
            title="On-chain entry coming after Alfajores MarketEngine deploy"
          >
            Yes (preview)
          </button>
          <button
            type="button"
            disabled
            className="flex-1 rounded-lg border py-2 text-muted-foreground cursor-not-allowed"
            title="On-chain entry coming after Alfajores MarketEngine deploy"
          >
            No (preview)
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Wallet transactions will be enabled after Alfajores E2E (see release notes). No funds are spent in preview
          mode.
        </p>
      </div>
      <Link to="/app/gooddollar/invite" className="text-sm text-primary underline">
        Try the referral API demo instead
      </Link>
      <Link to="/app/gooddollar/learn" className="block text-sm text-primary underline">
        New here? Learn how prediction works
      </Link>
    </div>
  );
}
