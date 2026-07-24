// src/lib/polymarket.ts
import { POLYMARKET_CONFIG } from '@/config/polymarket';
import { Market } from '@/types/market';

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  startDate: string;
  creationDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  markets: any[];
}

// Map Polymarket categories/tags to our internal categories
const categoryMap: Record<string, string> = {
  // Politics
  Politics: 'Politics',
  Elections: 'Politics',
  'US Politics': 'Politics',
  'Global Politics': 'Politics',
  'UK Politics': 'Politics',
  'European Politics': 'Politics',
  'Middle East': 'Politics',
  Biden: 'Politics',
  Trump: 'Politics',
  Congress: 'Politics',

  // Crypto
  Crypto: 'Crypto',
  Cryptocurrency: 'Crypto',
  Prices: 'Crypto',
  Bitcoin: 'Crypto',
  Ethereum: 'Crypto',
  Solana: 'Crypto',
  DeFi: 'Crypto',
  NFTs: 'Crypto',
  Airdrops: 'Crypto',
  'Layer 2': 'Crypto',

  // Sports (includes all major sub-sports)
  Sports: 'Sports',
  NFL: 'Sports',
  NBA: 'Sports',
  MLB: 'Sports',
  NHL: 'Sports',
  Soccer: 'Sports',
  'Premier League': 'Sports',
  'Champions League': 'Sports',
  Tennis: 'Sports',
  Golf: 'Sports',
  MMA: 'Sports',
  UFC: 'Sports',
  Boxing: 'Sports',
  F1: 'Sports',
  Olympics: 'Sports',
  Cricket: 'Sports',
  Esports: 'Sports',
  CS2: 'Sports',
  'Dota 2': 'Sports',
  'League of Legends': 'Sports',

  // Space / Science
  Science: 'Space',
  Space: 'Space',
  SpaceX: 'Space',
  NASA: 'Space',

  // AI
  AI: 'AI',
  'Artificial Intelligence': 'AI',
  ChatGPT: 'AI',
  OpenAI: 'AI',

  // Macro / Economics
  Economics: 'Macro',
  Macro: 'Macro',
  'Interest Rates': 'Macro',
  Inflation: 'Macro',
  Fed: 'Macro',

  // Corporate / Business
  Business: 'Corporate',
  Corporate: 'Corporate',
  Stocks: 'Corporate',
  Earnings: 'Corporate',

  // Commodities
  Commodities: 'Commodities',
  Gold: 'Commodities',
  Oil: 'Commodities',
  Silver: 'Commodities',

  // Trending / Pop Culture
  'Pop Culture': 'Trending',
  Entertainment: 'Trending',
  Movies: 'Trending',
  Music: 'Trending',
  Twitch: 'Trending',
  YouTube: 'Trending',
  Creators: 'Trending',
};

export async function fetchTrendingEvents(
  limit: number = POLYMARKET_CONFIG.NEWS.DEFAULT_LIMIT,
  targetCategory?: string
): Promise<PolymarketEvent[]> {
  try {
    const url = new URL(
      `${POLYMARKET_CONFIG.GAMMA_API_URL}${POLYMARKET_CONFIG.ENDPOINTS.EVENTS}`,
      window.location.origin
    );
    url.searchParams.append('limit', '100');
    url.searchParams.append('active', 'true');
    url.searchParams.append('closed', 'false');
    if (POLYMARKET_CONFIG.API_KEY) {
      url.searchParams.append('api_key', POLYMARKET_CONFIG.API_KEY);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': POLYMARKET_CONFIG.API_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API Error: ${response.status}`);
    }

    const data = await response.json();

    let events = data.map((item: any) => ({
      ...item,
      image: item.image || item.icon || 'https://polymarket.com/images/polymarket-logo.png',
    }));

    if (targetCategory) {
      events = events.filter((event: any) => {
        let eventCategory = 'Trending';
        if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
          for (const tag of event.tags) {
            const tagLabel = typeof tag === 'string' ? tag : tag.label;
            if (categoryMap[tagLabel]) {
              eventCategory = categoryMap[tagLabel];
              break;
            }
          }
        } else if (event.category && categoryMap[event.category]) {
          eventCategory = categoryMap[event.category];
        }
        return eventCategory === targetCategory;
      });
    }

    return events.slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch Polymarket events:', error);
    return [];
  }
}

export async function fetchLiveMarkets(limit: number = 100, offset: number = 0): Promise<Market[]> {
  try {
    const url = new URL(
      `${POLYMARKET_CONFIG.GAMMA_API_URL}${POLYMARKET_CONFIG.ENDPOINTS.EVENTS}`,
      window.location.origin
    );
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('active', 'true');
    url.searchParams.append('closed', 'false');
    if (offset > 0) url.searchParams.append('offset', offset.toString());
    if (POLYMARKET_CONFIG.API_KEY) {
      url.searchParams.append('api_key', POLYMARKET_CONFIG.API_KEY);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-api-key': POLYMARKET_CONFIG.API_KEY || '',
      },
    });

    if (!response.ok) throw new Error(`Polymarket API Error: ${response.status}`);

    const data = await response.json();
    const formattedMarkets: Market[] = [];

    for (const event of data) {
      if (!event.markets || event.markets.length === 0) continue;

      const primaryMarket = event.markets[0];

      let yesPrice = 0.5;
      let noPrice = 0.5;

      try {
        if (primaryMarket.outcomePrices) {
          const parsed = JSON.parse(primaryMarket.outcomePrices);
          const prices = Array.isArray(parsed) ? parsed : [];
          if (prices.length >= 2) {
            yesPrice = parseFloat(prices[0]) || 0.5;
            noPrice = parseFloat(prices[1]) || 1 - yesPrice;
          }
        }
      } catch (e) {
        console.error('Error parsing prices for', event.id);
      }

      let category = 'Trending';
      if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
        for (const tag of event.tags) {
          const tagLabel = typeof tag === 'string' ? tag : tag.label;
          if (categoryMap[tagLabel]) {
            category = categoryMap[tagLabel];
            break;
          }
        }
      } else if (event.category && categoryMap[event.category]) {
        category = categoryMap[event.category];
      }

      formattedMarkets.push({
        id: primaryMarket.id || event.id,
        title: event.title,
        category,
        volume: `$${(parseFloat(primaryMarket.volume || '0')).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        outcomes: [
          { id: 'yes', label: 'Yes', probability: Number((yesPrice * 100).toFixed(1)) },
          { id: 'no', label: 'No', probability: Number((noPrice * 100).toFixed(1)) },
        ],
        expiry: new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        image: event.image || event.icon || 'https://polymarket.com/images/polymarket-logo.png',
        icon: 'public',
        isFeatured: event.featured || false,
        isBinary: true,
      });
    }

    return formattedMarkets;
  } catch (error) {
    console.error('Failed to fetch live markets:', error);
    return [];
  }
}
