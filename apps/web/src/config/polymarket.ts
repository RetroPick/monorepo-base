// src/config/polymarket.ts

export const POLYMARKET_CONFIG = {
  // Base URLs for Polymarket APIs.
  // We route requests through the Vite Dev Server proxy to bypass CORS.
  GAMMA_API_URL: '/api/polymarket',
  CLOB_API_URL: 'https://clob.polymarket.com', // For Orderbook/Trading (if needed in future)
  API_KEY: '019c4c48-78d9-7e24-a147-b88c8ba0f8a0',

  // Default endpoints
  ENDPOINTS: {
    EVENTS: '/events',
    MARKETS: '/markets',
  },

  // Configuration for news fetching
  NEWS: {
    DEFAULT_LIMIT: 10,
    REFRESH_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  },
};
