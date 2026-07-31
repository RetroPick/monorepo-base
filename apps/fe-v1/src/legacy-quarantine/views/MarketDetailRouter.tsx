import { useParams } from "react-router-dom";

import { isPolymarketResourceId } from "@/features/markets/adapters/eventToMarket";
import MarketDetail from "@/views/MarketDetail";
import MarketDetailPolymarket from "@/views/MarketDetailPolymarket";

export default function MarketDetailRouter() {
  const { id = "" } = useParams();
  if (isPolymarketResourceId(decodeURIComponent(id))) {
    return <MarketDetailPolymarket />;
  }
  return <MarketDetail />;
}
