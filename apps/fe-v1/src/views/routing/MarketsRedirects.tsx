import { Navigate, useParams } from "react-router-dom";

function safePathSegment(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return encodeURIComponent(trimmed);
}

export function RedirectLegacyEventDetail() {
  const { eventId } = useParams();
  const encoded = safePathSegment(eventId);
  if (!encoded) return <Navigate to="/app/markets/all" replace />;
  return <Navigate to={`/app/events/${encoded}`} replace />;
}

export function RedirectLegacyMarketDetail() {
  const { marketId } = useParams();
  const encoded = safePathSegment(marketId);
  if (!encoded) return <Navigate to="/app/markets/all" replace />;
  return <Navigate to={`/app/market/${encoded}`} replace />;
}
