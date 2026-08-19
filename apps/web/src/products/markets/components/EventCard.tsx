import type { EventSummary } from "@retropick/polymarket";
import { PolymarketCard } from "./PolymarketCard";

interface EventCardProps {
  event: EventSummary;
}

export function EventCard({ event }: EventCardProps) {
  return <PolymarketCard event={event} />;
}

export default EventCard;
