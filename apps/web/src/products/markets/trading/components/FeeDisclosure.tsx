import { formatPrice } from "../../lib/decimal";
import {
  ORDER_CONTENT_HASH_LABEL,
  ORDER_ESTIMATED_FEE_LABEL,
  ORDER_FEE_UNAVAILABLE,
  ORDER_MAX_LOSS_LABEL,
  ORDER_NEG_RISK_LABEL,
} from "../lib/tradingCopy";
import type { OrderPreviewResponse } from "../lib/tradingApiClient";

interface FeeDisclosureProps {
  preview: OrderPreviewResponse;
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatCollateralBaseUnits(raw: string): string {
  if (!/^\d+$/.test(raw)) return "—";
  const decimals = 6;
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals) || "0";
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return `${frac ? `${whole}.${frac}` : whole} USDC`;
}

export function FeeDisclosure({ preview }: FeeDisclosureProps) {
  const { humanSummary, contentHash, exchangeDomain, warnings } = preview;
  const fee =
    humanSummary.estimatedFee && humanSummary.estimatedFee.length > 0
      ? humanSummary.estimatedFee
      : null;
  const maxLoss =
    humanSummary.action === "BUY"
      ? `${formatCollateralBaseUnits(preview.unsignedPayload.makerAmount)} collateral for ${humanSummary.size}`
      : `${humanSummary.size} (shares at risk)`;

  return (
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="font-medium text-foreground">{ORDER_MAX_LOSS_LABEL}</dt>
        <dd className="text-base font-semibold text-foreground">{maxLoss}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{ORDER_ESTIMATED_FEE_LABEL}</dt>
        <dd>{fee ?? ORDER_FEE_UNAVAILABLE}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Price</dt>
        <dd className="font-mono">{formatPrice(humanSummary.price)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{ORDER_CONTENT_HASH_LABEL}</dt>
        <dd className="font-mono text-xs">{truncateHash(contentHash)}</dd>
      </div>
      {exchangeDomain === "neg_risk" ? (
        <div>
          <dt className="text-amber-500">{ORDER_NEG_RISK_LABEL}</dt>
          <dd className="text-xs text-muted-foreground">Orders route through the Negative Risk exchange.</dd>
        </div>
      ) : null}
      {warnings && warnings.length > 0 ? (
        <div>
          <dt className="text-muted-foreground">Warnings</dt>
          <dd className="text-xs text-amber-500">{warnings.join(", ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}
