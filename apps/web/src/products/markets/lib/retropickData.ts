export type Category =
  | 'Crypto'
  | 'Sports'
  | 'Finance'
  | 'Financials'
  | 'Science'
  | 'Tech'
  | 'Economics'
  | 'Stocks'
  | 'AI'
  | 'Climate'

export type MarketType =
  | 'UP_OR_DOWN'
  | 'DIRECTION'
  | 'MULTIPLE_CHOICE'
  | 'RANGE'
  | 'THRESHOLD'
  | 'LADDER'
  | 'VELOCITY'
  | 'DATE'
  | 'CONVERGENCE'

export type MarketOption = {
  label: string
  percentage: number
  icon?: string
}

export type Market = {
  id: string
  question: string
  category: Category
  marketType: MarketType
  yes: number // 0-100 probability of YES
  volume: string
  liquidity: string
  participants: string
  timeLeft: string
  trend: 'up' | 'down'
  chart: number[]
  verified: boolean
  icon?: string // emoji-free short token label shown in the colored chip
  image?: string // Real image URL from Polymarket API
  accent?: string // hex color for the icon chip
  options?: MarketOption[]
  description?: string
  resolutionSource?: string
  tags?: string[]
}

export const CATEGORIES: Category[] = [
  'Crypto',
  'Economics',
  'Sports',
  'Finance',
  'Stocks',
  'Science',
  'Tech',
  'AI',
  'Climate',
]

function series(seed: number, up: boolean): number[] {
  const pts: number[] = []
  let v = 40 + (seed % 20)
  for (let i = 0; i < 24; i++) {
    const drift = up ? 0.8 : -0.6
    v += Math.sin(i * 0.6 + seed) * 6 + drift + (i % 3 === 0 ? 2 : -1)
    pts.push(Math.max(8, Math.min(92, v)))
  }
  return pts
}

const UNIQUE_TOPIC_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80', // Football Stadium
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80', // Bitcoin Gold Coin
  'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=200&auto=format&fit=crop&q=80', // Ethereum 3D Neon
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80', // Solana Holographic
  'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=200&auto=format&fit=crop&q=80', // Crypto Trading Screen
  'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80', // AI Chip Processor
  'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&auto=format&fit=crop&q=80', // US Dollar Currency
  'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=200&auto=format&fit=crop&q=80', // Stock Market Graph
  'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80', // Electric Vehicle Charging
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop&q=80', // Modern Smartphone
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80', // Cyber Security / Web
  'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=200&auto=format&fit=crop&q=80', // Gold Bullion Bars
  'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=200&auto=format&fit=crop&q=80', // OpenAI AI Brain
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=200&auto=format&fit=crop&q=80', // Growth Finance Piggybank
  'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=200&auto=format&fit=crop&q=80', // Running Track Sports
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=200&auto=format&fit=crop&q=80', // Tech Team Laptop
  'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=200&auto=format&fit=crop&q=80', // Financial Analytics Dashboard
  'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=200&auto=format&fit=crop&q=80', // Basketball Player Hoop
  'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=200&auto=format&fit=crop&q=80', // Baseball Field Stadium
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=200&auto=format&fit=crop&q=80', // Luxury Car Automotive
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80', // Planet Earth Space
  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200&auto=format&fit=crop&q=80', // Executive Business
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=200&auto=format&fit=crop&q=80', // Renewable Energy
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&auto=format&fit=crop&q=80', // Skyscraper Real Estate
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&auto=format&fit=crop&q=80', // Soccer Ball Net
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export enum ImageSource {
  API_MARKET = 'API_MARKET',
  API_EVENT = 'API_EVENT',
  LOCAL_ENTITY = 'LOCAL_ENTITY',
  LOCAL_CATEGORY_FALLBACK = 'LOCAL_CATEGORY_FALLBACK',
}

export interface ResolvedImage {
  url: string
  source: ImageSource
}

// Mapping ENTITAS spesifik -> local asset (.webp / .png)
const ENTITY_ASSET_MAP: Record<string, string> = {
  // Sports Entities
  'tennis': '/images/markets/Sports/tennis.webp',
  'wta': '/images/markets/Sports/tennis.webp',
  'atp': '/images/markets/Sports/tennis.webp',
  'wimbledon': '/images/markets/Sports/tennis.webp',
  'french open': '/images/markets/Sports/tennis.webp',
  'us open': '/images/markets/Sports/tennis.webp',
  'australian open': '/images/markets/Sports/tennis.webp',
  'grand slam': '/images/markets/Sports/tennis.webp',
  'costoulas': '/images/markets/Sports/tennis.webp',
  'inglis': '/images/markets/Sports/tennis.webp',
  'kozyreva': '/images/markets/Sports/tennis.webp',
  'lumsden': '/images/markets/Sports/tennis.webp',
  'chan': '/images/markets/Sports/tennis.webp',
  'joint': '/images/markets/Sports/tennis.webp',
  'djokovic': '/images/markets/Sports/tennis.webp',
  'alcaraz': '/images/markets/Sports/tennis.webp',
  'sinner': '/images/markets/Sports/tennis.webp',
  'swiatek': '/images/markets/Sports/tennis.webp',
  'sabalenka': '/images/markets/Sports/tennis.webp',
  'gauff': '/images/markets/Sports/tennis.webp',
  'medvedev': '/images/markets/Sports/tennis.webp',
  'zverev': '/images/markets/Sports/tennis.webp',

  'premier league': '/images/markets/Sports/soccer.webp',
  'champions league': '/images/markets/Sports/soccer.webp',
  "ballon d'or": '/images/markets/Sports/soccer.webp',
  'ballon dor': '/images/markets/Sports/soccer.webp',
  'haaland': '/images/markets/Sports/soccer.webp',
  'messi': '/images/markets/Sports/soccer.webp',
  'ronaldo': '/images/markets/Sports/soccer.webp',
  'mbappe': '/images/markets/Sports/soccer.webp',
  'soccer': '/images/markets/Sports/soccer.webp',
  'football': '/images/markets/Sports/soccer.webp',

  'formula 1': '/images/markets/Sports/F1.webp',
  'formula one': '/images/markets/Sports/F1.webp',
  'f1': '/images/markets/Sports/F1.webp',
  'verstappen': '/images/markets/Sports/verstappen.webp',
  'norris': '/images/markets/Sports/norris.jpg',
  'hamilton': '/images/markets/Sports/hamilton.webp',
  'leclerc': '/images/markets/Sports/leclerc.jpg',

  'baseball': '/images/markets/Sports/baseball.webp',
  'mlb': '/images/markets/Sports/baseball.webp',
  'cpbl': '/images/markets/Sports/baseball.webp',
  'home run': '/images/markets/Sports/baseball.webp',
  'aaron judge': '/images/markets/Sports/baseball.webp',
  'yankees': '/images/markets/Sports/baseball.webp',
  'dodgers': '/images/markets/Sports/baseball.webp',

  'nfl': '/images/markets/Sports/NFL.webp',
  'nba': '/images/markets/Sports/NBA.webp',
  'ufc': '/images/markets/Sports/UFC.webp',
  'mma': '/images/markets/Sports/UFC.webp',
  'golf': '/images/markets/Sports/golf.webp',
  'boxing': '/images/markets/Sports/boxing.webp',
  'cricket': '/images/markets/Sports/cricket.webp',
  'esport': '/images/markets/Sports/esport.webp',
  'esports': '/images/markets/Sports/esport.webp',
  'rampage': '/images/markets/Sports/esport.webp',
  'csgo': '/images/markets/Sports/esport.webp',
  'cs2': '/images/markets/Sports/esport.webp',
  'valorant': '/images/markets/Sports/esport.webp',
  'dota': '/images/markets/Sports/esport.webp',

  // Crypto Entities
  'bitcoin': '/images/markets/crypto/bitcoin.webp',
  'btc': '/images/markets/crypto/bitcoin.webp',
  'ethereum': '/images/markets/crypto/eth.webp',
  'eth': '/images/markets/crypto/eth.webp',
  'solana': '/images/markets/crypto/solana.webp',
  'sol': '/images/markets/crypto/solana.webp',
  'xrp': '/images/markets/crypto/xrp.webp',
  'base network': '/images/markets/crypto/base.webp',
  'arbitrum': '/images/markets/crypto/arbitrum.webp',
  'optimism': '/images/markets/crypto/optimism.webp',
  'zksync': '/images/markets/crypto/zksync.webp',
  'jupiter': '/images/markets/crypto/jupiter.webp',
  'raydium': '/images/markets/crypto/raydium.webp',
  'orca': '/images/markets/crypto/orca.webp',
  'meteora': '/images/markets/crypto/meteora.webp',
  'layer 2': '/images/markets/crypto/layer2.webp',
  'l2': '/images/markets/crypto/layer2.webp',

  // Finance Entities
  'nvidia': '/images/markets/finance/nvidia.webp',
  'nvda': '/images/markets/finance/nvidia.webp',
  'apple': '/apple.webp',
  'aapl': '/apple.webp',
  'iphone': '/apple.webp',
  'google': '/google.webp',
  'twitter': '/twitter.webp',
  'telegram': '/telegram.webp',
  'microsoft': '/images/markets/finance/microsoft.webp',
  'amazon': '/images/markets/finance/amazon.webp',
  'meta': '/images/markets/finance/meta.webp',
  'blackrock': '/images/markets/finance/blackrock.webp',
  'gold': '/images/markets/finance/gold.webp',
  'bank': '/images/markets/finance/bank.webp',
  's&p 500': '/images/markets/finance/stock.webp',
  's&p500': '/images/markets/finance/stock.webp',
  'spx': '/images/markets/finance/stock.webp',
  'nasdaq': '/images/markets/finance/stock.webp',
  'dow jones': '/images/markets/finance/stock.webp',

  // Tech & AI Entities
  'chatgpt': '/images/markets/tech%20&%20AI/openAI.webp',
  'openai': '/images/markets/tech%20&%20AI/openAI.webp',
  'gemini': '/images/markets/tech%20&%20AI/gemini.webp',
  'claude': '/images/markets/tech%20&%20AI/claude.webp',
  'grok': '/images/markets/tech%20&%20AI/grok.webp',
  'tesla': '/images/markets/tech%20&%20AI/tesla.webp',
  'byd': '/images/markets/tech%20&%20AI/byd.webp',
  'spacex': '/images/markets/tech%20&%20AI/spaceX.webp',
  'starship': '/images/markets/tech%20&%20AI/spaceX.webp',
  'ev': '/images/markets/tech%20&%20AI/ev.webp',
  'evs': '/images/markets/tech%20&%20AI/ev.webp',
  'electric vehicle': '/images/markets/tech%20&%20AI/ev.webp',
  'chip': '/images/markets/tech%20&%20AI/chips.webp',
  'chips': '/images/markets/tech%20&%20AI/chips.webp',
  'semiconductor': '/images/markets/tech%20&%20AI/chips.webp',
  'cybersecurity': '/images/markets/tech%20&%20AI/cyberscurity.webp',
  'quantum': '/images/markets/tech%20&%20AI/quantum.webp',
  'ai robotics': '/images/markets/tech%20&%20AI/AI_robotic.webp',
  'robotics': '/images/markets/tech%20&%20AI/AI_robotic.webp',
  'ai model': '/images/markets/tech%20&%20AI/AI_robotic.webp',
  'ai models': '/images/markets/tech%20&%20AI/AI_robotic.webp',

  // Browsers & Smartphones Entities
  'browser': '/images/markets/tech%20&%20AI/browser.webp',
  'browsers': '/images/markets/tech%20&%20AI/browser.webp',
  'chrome': '/images/markets/tech%20&%20AI/chrome.webp',
  'edge': '/images/markets/tech%20&%20AI/edge.webp',
  'brave': '/images/markets/tech%20&%20AI/brave.webp',
  'smartphone': '/images/markets/tech%20&%20AI/hp.webp',
  'smartphones': '/images/markets/tech%20&%20AI/hp.webp',
  'phone': '/images/markets/tech%20&%20AI/hp.webp',
  'mobile': '/images/markets/tech%20&%20AI/hp.webp',
  'hp': '/images/markets/tech%20&%20AI/hp.webp',

  // Economics Entities
  'federal reserve': '/images/markets/economics/Fed.webp',
  'jerome powell': '/images/markets/economics/Fed.webp',
  'powell': '/images/markets/economics/Fed.webp',
  'cpi': '/images/markets/economics/Fed.webp',
  'inflation': '/images/markets/economics/Fed.webp',
  'fed': '/images/markets/economics/Fed.webp',

  // Climate & Location Entities
  'paris': '/images/markets/finance/paris.webp',
  'temperature in paris': '/images/markets/finance/paris.webp',
  'el salvador': '/images/markets/crypto/bitcoin.webp',
  'salvador': '/images/markets/crypto/bitcoin.webp',
  'solar power': '/images/markets/climate/green_energy.webp',
  'wind energy': '/images/markets/climate/green_energy.webp',
  'green energy': '/images/markets/climate/green_energy.webp',
  'climate change': '/images/markets/climate/climate.webp',
  'climate': '/images/markets/climate/climate.webp',
}

// Fallback Asset Generic per Kategori
const CATEGORY_FALLBACK_ASSET: Record<string, string> = {
  Crypto: '/images/markets/crypto/bitcoin.webp',
  Sports: '/images/markets/Sports/soccer.webp',
  Finance: '/images/markets/finance/stock.webp',
  Financials: '/images/markets/finance/stock.webp',
  Tech: '/images/markets/tech%20&%20AI/chips.webp',
  AI: '/images/markets/tech%20&%20AI/openAI.webp',
  Economics: '/images/markets/economics/Fed.webp',
  Climate: '/images/markets/climate/climate.webp',
}

export function resolveMarketImage(market: {
  id?: string
  question?: string
  category?: string
  icon?: string
  image?: string
  eventImage?: string
  eventIcon?: string
  slug?: string
  title?: string
}): ResolvedImage {
  if (!market) {
    return { url: '/images/markets/crypto/bitcoin.webp', source: ImageSource.LOCAL_CATEGORY_FALLBACK }
  }

  const isRealApiUrl = (url?: string) => {
    if (!url || typeof url !== 'string') return false
    if (!url.startsWith('http')) return false
    if (url.includes('images.unsplash.com')) return false
    if (url.includes('photo-1541872703')) return false
    return true
  }

  // TIER 1: Real Polymarket API image/icon (icon takes priority for crisp square avatars)
  if (isRealApiUrl(market.icon)) {
    return { url: market.icon!, source: ImageSource.API_MARKET }
  }
  if (isRealApiUrl(market.image)) {
    return { url: market.image!, source: ImageSource.API_MARKET }
  }
  if (isRealApiUrl(market.eventIcon)) {
    return { url: market.eventIcon!, source: ImageSource.API_EVENT }
  }
  if (isRealApiUrl(market.eventImage)) {
    return { url: market.eventImage!, source: ImageSource.API_EVENT }
  }

  // TIER 2: Local asset berbasis ENTITAS spesifik (only when API image is missing)
  const haystack = `${market.question || ''} ${market.title || ''} ${(market.slug || '').replace(/-/g, ' ')}`.toLowerCase()

  const matchedEntities = Object.keys(ENTITY_ASSET_MAP)
    .filter((entity) => {
      const escaped = entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return new RegExp(`\\b${escaped}\\b`, 'i').test(haystack)
    })
    .sort((a, b) => b.length - a.length)

  if (matchedEntities.length > 0) {
    const bestMatch = matchedEntities[0]
    return { url: ENTITY_ASSET_MAP[bestMatch], source: ImageSource.LOCAL_ENTITY }
  }

  // TIER 3: Category Fallback
  const cat = market.category || 'Crypto'
  const fallback = CATEGORY_FALLBACK_ASSET[cat] || '/images/markets/crypto/bitcoin.webp'
  return { url: fallback, source: ImageSource.LOCAL_CATEGORY_FALLBACK }
}

export function getSafeMarketImage(market: any): string {
  return resolveMarketImage(market).url
}

export function getOptionThumbnail(optLabel: string, market?: { category?: string; question?: string; icon?: string; image?: string }): string | null {
  const label = (optLabel || '').toLowerCase()

  // Avoid giving thumbnails to generic binary/range labels
  if (/\b(over|under|yes|no|up|down|other|none|above|below)\b/i.test(label)) {
    return null
  }

  // 1. AI Models
  if (/\b(chatgpt|openai)\b/i.test(label)) {
    return '/images/markets/tech & AI/openAI.webp'
  }
  if (/\b(gemini|google gemini)\b/i.test(label)) {
    return '/images/markets/tech & AI/gemini.webp'
  }
  if (/\b(claude|anthropic)\b/i.test(label)) {
    return '/images/markets/tech & AI/claude.webp'
  }
  if (/\b(grok|xai)\b/i.test(label)) {
    return '/images/markets/tech & AI/grok.webp'
  }

  // 2. Web Browsers
  if (/\b(chrome|google chrome)\b/i.test(label)) {
    return '/images/markets/tech & AI/chrome.webp'
  }
  if (/\b(edge|microsoft edge)\b/i.test(label)) {
    return '/images/markets/tech & AI/edge.webp'
  }
  if (/\b(arc|arc browser)\b/i.test(label)) {
    return '/images/markets/tech & AI/arc.webp'
  }
  if (/\b(brave|brave browser)\b/i.test(label)) {
    return '/images/markets/tech & AI/brave.webp'
  }

  // 3. EV Automakers
  if (/\b(byd|byd auto)\b/i.test(label)) {
    return '/images/markets/tech & AI/byd.webp'
  }
  if (/\b(tesla|tesla inc)\b/i.test(label)) {
    return '/images/markets/tech & AI/tesla.webp'
  }
  if (/\b(xiaomi|xiaomi auto)\b/i.test(label)) {
    return '/images/markets/tech & AI/xiaomi.webp'
  }
  if (/\b(volkswagen|vw)\b/i.test(label)) {
    return '/images/markets/tech & AI/volkswagen.webp'
  }
  if (/\b(ev|evs|electric vehicle|electric vehicles|rivian|lucid)\b/i.test(label)) {
    return '/images/markets/tech & AI/ev.webp'
  }

  // 4. Tech & Corporations
  if (/\b(microsoft|msft)\b/i.test(label)) {
    return '/images/markets/finance/microsoft.webp'
  }
  if (/\b(amazon|amzn)\b/i.test(label)) {
    return '/images/markets/finance/amazon.webp'
  }
  if (/\b(meta|facebook)\b/i.test(label)) {
    return '/images/markets/finance/meta.webp'
  }
  if (/\b(spacex|starlink|falcon)\b/i.test(label)) {
    return '/images/markets/tech & AI/spaceX.webp'
  }

  // 5. Smartphones & Electronics
  if (/\b(apple|iphone|aapl)\b/i.test(label)) {
    return '/apple.webp'
  }
  if (/\b(samsung|galaxy)\b/i.test(label)) {
    return '/images/markets/finance/samsung.webp'
  }
  if (/\b(pixel|google pixel|google)\b/i.test(label)) {
    return '/google.webp'
  }
  if (/\b(motorola|lenovo)\b/i.test(label)) {
    return '/images/markets/finance/motorola.webp'
  }

  // 6. Financials
  if (/\b(nvidia|nvda)\b/i.test(label)) {
    return '/images/markets/finance/nvidia.webp'
  }
  if (/\b(blackrock|blk)\b/i.test(label)) {
    return '/images/markets/finance/blackrock.webp'
  }

  // 7. Solana DEXes & Crypto
  if (/\b(jupiter)\b/i.test(label)) {
    return '/images/markets/crypto/jupiter.webp'
  }
  if (/\b(raydium)\b/i.test(label)) {
    return '/images/markets/crypto/raydium.webp'
  }
  if (/\b(orca)\b/i.test(label)) {
    return '/images/markets/crypto/orca.webp'
  }
  if (/\b(meteora)\b/i.test(label)) {
    return '/images/markets/crypto/meteora.webp'
  }
  if (/\b(solana|sol)\b/i.test(label)) {
    return '/images/markets/crypto/solana.webp'
  }
  if (/\b(btc|bitcoin)\b/i.test(label)) {
    return '/images/markets/crypto/bitcoin.webp'
  }
  if (/\b(eth|ethereum)\b/i.test(label)) {
    return '/images/markets/crypto/eth.webp'
  }
  if (/\b(xrp|ripple)\b/i.test(label)) {
    return '/images/markets/crypto/xrp.webp'
  }

  // 8. Layer 2 Networks
  if (/\b(base|base network|base chain)\b/i.test(label)) {
    return '/images/markets/crypto/base.webp'
  }
  if (/\b(arbitrum)\b/i.test(label)) {
    return '/images/markets/crypto/arbitrum.webp'
  }
  if (/\b(optimism|op mainnet)\b/i.test(label)) {
    return '/images/markets/crypto/optimism.webp'
  }
  if (/\b(zksync)\b/i.test(label)) {
    return '/images/markets/crypto/zksync.webp'
  }
  if (/\b(l2|layer2)\b/i.test(label)) {
    return '/images/markets/crypto/layer2.webp'
  }

  // 9. Sports & Athletes
  if (/\b(verstappen|max verstappen)\b/i.test(label)) return '/images/markets/Sports/verstappen.webp'
  if (/\b(norris|lando norris|lando)\b/i.test(label)) return '/images/markets/Sports/norris.webp'
  if (/\b(hamilton|lewis hamilton)\b/i.test(label)) return '/images/markets/Sports/hamilton.webp'
  if (/\b(leclerc|charles leclerc|charles)\b/i.test(label)) return '/images/markets/Sports/leclerc.webp'
  if (/\b(tennis)\b/i.test(label)) return '/images/markets/Sports/tennis.webp'
  if (/\b(golf)\b/i.test(label)) return '/images/markets/Sports/golf.webp'
  if (/\b(esport|esports)\b/i.test(label)) return '/images/markets/Sports/esport.webp'
  if (/\b(boxing)\b/i.test(label)) return '/images/markets/Sports/boxing.webp'
  if (/\b(cricket)\b/i.test(label)) return '/images/markets/Sports/cricket.webp'
  if (/\b(f1|formula 1)\b/i.test(label)) return '/images/markets/Sports/F1.webp'
  if (/\b(nfl)\b/i.test(label)) return '/images/markets/Sports/NFL.webp'
  if (/\b(mlb|baseball)\b/i.test(label)) return '/images/markets/Sports/baseball.webp'
  if (/\b(nba|basketball)\b/i.test(label)) return '/images/markets/Sports/NBA.webp'
  if (/\b(ufc)\b/i.test(label)) return '/images/markets/Sports/UFC.webp'
  if (/\b(soccer|football)\b/i.test(label)) return '/images/markets/Sports/soccer.webp'

  return null
}

export const MARKETS: Market[] = [
  // --- TOP 6 FEATURED CARDS (Exact match to User Screenshot) ---
  {
    id: 'fed-decision-september',
    question: 'Fed Decision in September?',
    category: 'Economics',
    marketType: 'MULTIPLE_CHOICE',
    yes: 71,
    volume: '$37M Vol.',
    liquidity: '$9.4M',
    image: '/images/markets/economics/Fed.webp',
    participants: '16.2K',
    timeLeft: 'Sep 30, 2026',
    trend: 'up',
    chart: series(71, true),
    verified: true,
    icon: 'FED',
    options: [
      { label: 'No change', percentage: 71 },
      { label: '25 bps increase', percentage: 29 },
    ],
  },
  {
    id: 'btc-up-down-5m',
    question: 'BTC Up or Down 5m',
    category: 'Crypto',
    marketType: 'DIRECTION',
    yes: 51,
    volume: '$1.2M Vol.',
    liquidity: '$850K',
    image: '/images/markets/crypto/bitcoin.webp',
    participants: '24.1K',
    timeLeft: '5m remaining',
    trend: 'up',
    chart: series(51, true),
    verified: true,
    icon: 'BTC',
  },
  {
    id: 'eth-up-down-5m',
    question: 'Ethereum Up or Down - 5 Min',
    category: 'Crypto',
    marketType: 'DIRECTION',
    yes: 36,
    volume: '$780K Vol.',
    liquidity: '$420K',
    image: '/images/markets/crypto/eth.webp',
    participants: '18.3K',
    timeLeft: '5m remaining',
    trend: 'down',
    chart: series(36, false),
    verified: true,
    icon: 'ETH',
  },
  {
    id: 'sol-up-down-5m',
    question: 'Solana Up or Down - 5 Min',
    category: 'Crypto',
    marketType: 'DIRECTION',
    yes: 51,
    volume: '$640K Vol.',
    liquidity: '$310K',
    image: '/images/markets/crypto/solana.webp',
    participants: '14.7K',
    timeLeft: '5m remaining',
    trend: 'up',
    chart: series(51, true),
    verified: true,
    icon: 'SOL',
  },
  {
    id: 'xrp-up-down-5m',
    question: 'XRP Up or Down - 5 Min',
    category: 'Crypto',
    marketType: 'DIRECTION',
    yes: 65,
    volume: '$390K Vol.',
    liquidity: '$180K',
    image: '/images/markets/crypto/xrp.webp',
    participants: '9.2K',
    timeLeft: '5m remaining',
    trend: 'up',
    chart: series(65, true),
    verified: true,
    icon: 'XRP',
  },
  {
    id: 'doge-up-down-5m',
    question: 'Dogecoin Up or Down - 5 Min',
    category: 'Crypto',
    marketType: 'DIRECTION',
    yes: 31,
    volume: '$220K Vol.',
    liquidity: '$110K',
    image: '/images/markets/crypto/doge.webp',
    participants: '7.8K',
    timeLeft: '5m remaining',
    trend: 'down',
    chart: series(31, false),
    verified: true,
    icon: 'DOGE',
  },
  {
    id: 'openai-gpt6-2026',
    question: 'Will OpenAI release GPT-6 before end of 2026?',
    category: 'AI',
    marketType: 'THRESHOLD',
    yes: 71,
    volume: '$16M Vol.',
    liquidity: '$4.2M',
    image: '/images/markets/tech & AI/openAI.webp',
    participants: '19.5K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(71, true),
    verified: true,
    icon: 'AI',
  },
  {
    id: 'strait-of-hormuz',
    question: 'Strait of Hormuz traffic returns to normal by September 30?',
    category: 'Climate',
    marketType: 'THRESHOLD',
    yes: 9,
    volume: '$4M Vol.',
    liquidity: '$1.2M',
    image: '/images/markets/climate/climate.webp',
    participants: '8.4K',
    timeLeft: 'Sep 30, 2026',
    trend: 'down',
    chart: series(9, false),
    verified: true,
    icon: 'HORMUZ',
  },
  {
    id: 'fifa-world-cup-2026-winner',
    question: 'Who will win the FIFA World Cup 2026?',
    category: 'Sports',
    marketType: 'MULTIPLE_CHOICE',
    yes: 38,
    volume: '$6M Vol.',
    liquidity: '$1.8M',
    image: '/images/markets/Sports/soccer.webp',
    participants: '14.2K',
    timeLeft: 'Jul 19, 2026',
    trend: 'up',
    chart: series(38, true),
    verified: true,
    icon: 'FIFA',
    options: [
      { label: 'Brazil', percentage: 38 },
      { label: 'France', percentage: 32 },
    ],
  },
  {
    id: 'nvidia-market-cap-5t',
    question: 'Will NVIDIA reach $5 Trillion market cap in 2026?',
    category: 'Financials',
    marketType: 'THRESHOLD',
    yes: 77,
    volume: '$1.4M Vol.',
    liquidity: '$620K',
    image: '/images/markets/tech & AI/nvidia.webp',
    participants: '8.8K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(77, true),
    verified: true,
    icon: 'NVDA',
  },
  {
    id: 'btc-150k-2027',
    question: 'Will Bitcoin hit $150,000 before Jan 1, 2027?',
    category: 'Crypto',
    marketType: 'THRESHOLD',
    yes: 64,
    volume: '$2.42M Vol.',
    liquidity: '$1.08M',
    image: '/images/markets/crypto/bitcoin.webp',
    participants: '18.4K',
    timeLeft: 'Jan 1, 2027',
    trend: 'up',
    chart: series(64, true),
    verified: true,
    icon: 'BTC',
  },
  {
    id: 'openai-gpt6-2025',
    question: 'Will OpenAI release GPT-6 in 2025?',
    category: 'AI',
    marketType: 'DIRECTION',
    yes: 41,
    volume: '$850K',
    liquidity: '$420K',
    image: '/images/markets/tech & AI/openAI.webp',
    participants: '11.2K',
    timeLeft: 'Dec 31, 2025',
    trend: 'up',
    chart: series(41, true),
    verified: true,
    icon: 'AI',
  },
  {
    id: 'wta-swiatek-sakkari',
    question: 'I. Swiatek vs M. Sakkari',
    category: 'Sports',
    marketType: 'UP_OR_DOWN',
    yes: 93,
    volume: '$661K',
    liquidity: '$240k',
    image: '/images/markets/Sports/tennis.webp',
    participants: '2.1K',
    timeLeft: 'Live',
    trend: 'up',
    chart: series(93, true),
    verified: true,
    icon: 'WTA',
    tags: ['Sports', 'Tennis', 'WTA Tour'],
  },
  {
    id: 'atp-tirante-landaluce',
    question: 'T. Tirante vs M. Landaluce',
    category: 'Sports',
    marketType: 'UP_OR_DOWN',
    yes: 82,
    volume: '$621K',
    liquidity: '$190k',
    image: '/images/markets/Sports/tennis.webp',
    participants: '1.8K',
    timeLeft: 'Live',
    trend: 'up',
    chart: series(82, true),
    verified: true,
    icon: 'ATP',
    tags: ['Sports', 'Tennis', 'ATP Tour'],
  },
  {
    id: 'geng-academy-vs-hanjin',
    question: 'Gen.G Global Academy vs HANJIN BRION Challengers',
    category: 'Sports',
    marketType: 'UP_OR_DOWN',
    yes: 38,
    volume: '$520K',
    liquidity: '$180k',
    image: '/images/markets/Sports/tennis.webp',
    participants: '2.4K',
    timeLeft: 'Live',
    trend: 'up',
    chart: series(38, true),
    verified: true,
    icon: 'LOL',
    tags: ['Sports', 'Esports', 'LoL', 'LCK'],
  },
  {
    id: 'strait-of-hormuz-normal',
    question: 'Strait of Hormuz traffic returns to normal by September 30?',
    category: 'Economics',
    marketType: 'UP_OR_DOWN',
    yes: 9,
    volume: '$4M',
    liquidity: '$1.2m',
    image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=200&auto=format&fit=crop&q=80',
    participants: '3.6K',
    timeLeft: 'Sep 30, 2026',
    trend: 'down',
    chart: series(9, false),
    verified: true,
    icon: 'GEO',
  },
  {
    id: 'florida-gov-rep-winner',
    question: 'Florida Governor Republican Primary Winner',
    category: 'Economics',
    marketType: 'MULTIPLE_CHOICE',
    yes: 99,
    volume: '$5M',
    liquidity: '$1.5m',
    image: '/images/markets/economics/Fed.webp',
    participants: '4.2K',
    timeLeft: 'Nov 3, 2026',
    trend: 'up',
    chart: series(99, true),
    verified: true,
    icon: 'POL',
    options: [
      { label: 'Byron Donalds', percentage: 99 },
      { label: 'James Fishback', percentage: 1 },
    ]
  },
  {
    id: 'florida-gov-rep-second',
    question: 'Florida Governor Republican Primary Second Place',
    category: 'Economics',
    marketType: 'MULTIPLE_CHOICE',
    yes: 77,
    volume: '$121K',
    liquidity: '$45k',
    image: '/images/markets/economics/Fed.webp',
    participants: '820',
    timeLeft: 'Nov 3, 2026',
    trend: 'up',
    chart: series(77, true),
    verified: true,
    icon: 'POL',
    options: [
      { label: 'Jay Collins', percentage: 77 },
      { label: 'James Fishback', percentage: 23 },
    ]
  },
  {
    id: 'solana-tvl-15b',
    question: 'Solana DeFi TVL above $15B before Q4 2026?',
    category: 'Crypto',
    marketType: 'UP_OR_DOWN',
    yes: 74,
    volume: '$8.2M Vol.',
    liquidity: '$2.4M',
    image: '/images/markets/crypto/solana.webp',
    participants: '16.8K',
    timeLeft: 'Sep 30, 2026',
    trend: 'up',
    chart: series(74, true),
    verified: true,
    icon: 'SOL',
  },
  {
    id: 'spacex-starship-mars',
    question: 'SpaceX Starship uncrewed Mars landing attempt in 2026?',
    category: 'Tech',
    marketType: 'UP_OR_DOWN',
    yes: 42,
    volume: '$5.1M Vol.',
    liquidity: '$1.8M',
    image: 'https://images.unsplash.com/photo-1517976487502-58e178121aa7?w=200&auto=format&fit=crop&q=80',
    participants: '12.4K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(42, true),
    verified: true,
    icon: 'SPACE',
  },
  {
    id: 'anthropic-ipo-by-date',
    question: 'Anthropic IPO by __?',
    category: 'AI',
    marketType: 'MULTIPLE_CHOICE',
    yes: 86,
    volume: '$6.8M',
    liquidity: '$2.1m',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80',
    participants: '7.9K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(86, true),
    verified: true,
    icon: 'AI',
    options: [
      { label: 'December 31, 2026', percentage: 86 },
      { label: 'October 31, 2026', percentage: 70 },
    ]
  },
  // --- CONVERGENCE MARKETS ---
  {
    id: 'ai-model-convergence',
    question: 'Which AI model will reach 100M daily active users first?',
    category: 'AI',
    marketType: 'CONVERGENCE',
    yes: 54,
    volume: '$18.5m',
    liquidity: '$4.8m',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80',
    participants: '12.0K',
    timeLeft: 'May 31, 2027',
    trend: 'up',
    chart: series(49, true),
    verified: true,
    resolutionSource: 'openai.com',
    icon: 'AI',
    accent: '#8b5cf6',
    options: [
      { label: 'ChatGPT (OpenAI)', percentage: 54, icon: 'openai' },
      { label: 'Gemini (Google)', percentage: 28, icon: 'google' },
      { label: 'Claude (Anthropic)', percentage: 12, icon: 'claude' },
      { label: 'Grok (xAI)', percentage: 4, icon: 'grok' },
      { label: 'Other Model', percentage: 2 }
    ]
  },
  {
    id: 'ev-market-leader-2026',
    question: 'Which automaker will deliver the most EVs globally in 2026?',
    category: 'Tech',
    marketType: 'CONVERGENCE',
    yes: 48,
    volume: '$14.2m',
    liquidity: '$3.9m',
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
    participants: '9.4K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(51, true),
    verified: true,
    icon: 'EV',
    accent: '#e82127',
    options: [
      { label: 'BYD Auto', percentage: 48, icon: 'byd' },
      { label: 'Tesla Inc', percentage: 41, icon: 'tesla' },
      { label: 'Xiaomi Auto', percentage: 7 },
      { label: 'Volkswagen Group', percentage: 4 }
    ]
  },
  {
    id: 'eth-l2-tvl-leader',
    question: 'Which Ethereum L2 will reach $25B TVL first?',
    category: 'Crypto',
    marketType: 'CONVERGENCE',
    yes: 52,
    volume: '$9.8m',
    liquidity: '$2.7m',
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=200&auto=format&fit=crop&q=80',
    participants: '8.1K',
    timeLeft: 'Oct 31, 2026',
    trend: 'up',
    chart: series(53, true),
    verified: true,
    icon: 'L2',
    accent: '#0052ff',
    options: [
      { label: 'Base Network', percentage: 52, icon: 'base' },
      { label: 'Arbitrum One', percentage: 34 },
      { label: 'Optimism (OP Mainnet)', percentage: 10 },
      { label: 'zkSync Era', percentage: 4 }
    ]
  },
  {
    id: 'solana-dex-volume-2026',
    question: 'Which DEX will dominate Solana trading volume in Q3 2026?',
    category: 'Crypto',
    marketType: 'CONVERGENCE',
    yes: 64,
    volume: '$11.3m',
    liquidity: '$3.5m',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80',
    participants: '7.8K',
    timeLeft: 'Sep 30, 2026',
    trend: 'up',
    chart: series(55, true),
    verified: true,
    icon: 'DEX',
    accent: '#14f195',
    options: [
      { label: 'Jupiter Aggregator', percentage: 64, icon: 'solana' },
      { label: 'Raydium Protocol', percentage: 24 },
      { label: 'Orca DEX', percentage: 8 },
      { label: 'Meteora DLMM', percentage: 4 }
    ]
  },
  {
    id: 'us-smartphone-market-share',
    question: 'Which brand will hold top US smartphone market share in Q4 2026?',
    category: 'Tech',
    marketType: 'CONVERGENCE',
    yes: 58,
    volume: '$8.7m',
    liquidity: '$2.1m',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop&q=80',
    participants: '5.6K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(57, true),
    verified: true,
    icon: 'MOB',
    accent: '#a1a1a1',
    options: [
      { label: 'Apple iPhone', percentage: 58, icon: 'apple' },
      { label: 'Samsung Galaxy', percentage: 36 },
      { label: 'Google Pixel', percentage: 5 },
      { label: 'Motorola / Lenovo', percentage: 1 }
    ]
  },
  {
    id: 'ai-browser-race',
    question: 'First browser to integrate native autonomous AI agents for all users?',
    category: 'Tech',
    marketType: 'CONVERGENCE',
    yes: 42,
    volume: '$6.5m',
    liquidity: '$1.8m',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
    participants: '4.2K',
    timeLeft: 'Nov 30, 2026',
    trend: 'up',
    chart: series(59, true),
    verified: true,
    icon: 'WEB',
    accent: '#4285f4',
    options: [
      { label: 'Google Chrome', percentage: 42, icon: 'google' },
      { label: 'Microsoft Edge', percentage: 33 },
      { label: 'Arc Browser / The Browser Co', percentage: 18 },
      { label: 'Brave Browser', percentage: 7 }
    ]
  },

  // --- VELOCITY MARKETS ---
  {
    id: 'sol-move-velocity',
    question: 'How much will SOL move in the next 24 hours?',
    category: 'Crypto',
    marketType: 'VELOCITY',
    yes: 32,
    volume: '$6.7m',
    liquidity: '$2.2m',
    participants: '3.1K',
    timeLeft: '24h Market',
    trend: 'down',
    chart: series(34, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80',
    accent: '#00ffad',
    options: [
      { label: '0% - 3%', percentage: 20 },
      { label: '3% - 5%', percentage: 32 },
      { label: '5% - 10%', percentage: 28 },
      { label: '10% - 20%', percentage: 15 },
      { label: 'Above 20%', percentage: 5 }
    ]
  },
  {
    id: 'btc-24h-volatility-range',
    question: 'Bitcoin 24-hour price swing range today?',
    category: 'Crypto',
    marketType: 'VELOCITY',
    yes: 45,
    volume: '$12.4m',
    liquidity: '$4.1m',
    participants: '8.9K',
    timeLeft: '24h Market',
    trend: 'up',
    chart: series(36, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    icon: 'BTC',
    accent: '#f7931a',
    options: [
      { label: '0% - 2%', percentage: 45 },
      { label: '2% - 5%', percentage: 38 },
      { label: '5% - 10%', percentage: 12 },
      { label: 'Above 10%', percentage: 5 }
    ]
  },
  {
    id: 'eth-gas-fee-surge',
    question: 'Peak Ethereum gas fee in the next 24 hours?',
    category: 'Crypto',
    marketType: 'VELOCITY',
    yes: 52,
    volume: '$4.8m',
    liquidity: '$1.5m',
    participants: '3.4K',
    timeLeft: '24h Market',
    trend: 'up',
    chart: series(38, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=200&auto=format&fit=crop&q=80',
    icon: 'GAS',
    accent: '#627eea',
    options: [
      { label: '< 20 Gwei', percentage: 22 },
      { label: '20 - 50 Gwei', percentage: 52 },
      { label: '50 - 100 Gwei', percentage: 20 },
      { label: '> 100 Gwei', percentage: 6 }
    ]
  },
  {
    id: 'nvda-earnings-velocity',
    question: 'NVIDIA post-earnings 24h price swing magnitude?',
    category: 'Tech',
    marketType: 'VELOCITY',
    yes: 41,
    volume: '$15.1m',
    liquidity: '$4.6m',
    participants: '10.2K',
    timeLeft: 'Aug 28, 2026',
    trend: 'up',
    chart: series(40, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80',
    icon: 'NVDA',
    accent: '#76b900',
    options: [
      { label: '0% - 3%', percentage: 18 },
      { label: '3% - 7%', percentage: 41 },
      { label: '7% - 12%', percentage: 29 },
      { label: 'Above 12%', percentage: 12 }
    ]
  },
  {
    id: 'sp500-daily-velocity',
    question: 'S&P 500 maximum single-day percentage change this week?',
    category: 'Finance',
    marketType: 'VELOCITY',
    yes: 62,
    volume: '$7.3m',
    liquidity: '$2.3m',
    participants: '5.1K',
    timeLeft: '5d Market',
    trend: 'up',
    chart: series(42, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=200&auto=format&fit=crop&q=80',
    icon: 'SPX',
    accent: '#003478',
    options: [
      { label: '0.0% - 1.0%', percentage: 62 },
      { label: '1.0% - 2.5%', percentage: 28 },
      { label: 'Above 2.5%', percentage: 10 }
    ]
  },

  // --- LADDER MARKETS ---
  {
    id: 'btc-highest-ladder',
    question: 'Highest price of BTC in 2026?',
    category: 'Crypto',
    marketType: 'LADDER',
    yes: 60,
    volume: '$18.9m',
    liquidity: '$6.3m',
    participants: '4.4K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(29, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    accent: '#f7931a',
    options: [
      { label: '>= $100,000', percentage: 95 },
      { label: '>= $120,000', percentage: 82 },
      { label: '>= $140,000', percentage: 60 },
      { label: '>= $160,000', percentage: 38 },
      { label: '>= $180,000', percentage: 21 },
      { label: '>= $200,000', percentage: 10 }
    ]
  },
  {
    id: 'eth-ladder-2026',
    question: 'Highest price of ETH in 2026?',
    category: 'Crypto',
    marketType: 'LADDER',
    yes: 74,
    volume: '$14.1m',
    liquidity: '$4.5m',
    participants: '6.8K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(31, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=200&auto=format&fit=crop&q=80',
    accent: '#627eea',
    options: [
      { label: '>= $4,000', percentage: 91 },
      { label: '>= $5,000', percentage: 74 },
      { label: '>= $6,500', percentage: 48 },
      { label: '>= $8,000', percentage: 26 },
      { label: '>= $10,000', percentage: 11 }
    ]
  },
  {
    id: 'sol-ladder-2026',
    question: 'Highest price of Solana in 2026?',
    category: 'Crypto',
    marketType: 'LADDER',
    yes: 68,
    volume: '$12.8m',
    liquidity: '$3.9m',
    participants: '7.2K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(33, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80',
    accent: '#14f195',
    options: [
      { label: '>= $250', percentage: 88 },
      { label: '>= $350', percentage: 68 },
      { label: '>= $500', percentage: 41 },
      { label: '>= $750', percentage: 19 },
      { label: '>= $1,000', percentage: 7 }
    ]
  },
  {
    id: 'nvda-stock-ladder',
    question: 'NVIDIA market cap milestone in 2026?',
    category: 'Tech',
    marketType: 'LADDER',
    yes: 78,
    volume: '$16.5m',
    liquidity: '$5.2m',
    participants: '9.1K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(35, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80',
    icon: 'NVDA',
    accent: '#76b900',
    options: [
      { label: '>= $3.5 Trillion', percentage: 92 },
      { label: '>= $4.0 Trillion', percentage: 78 },
      { label: '>= $4.5 Trillion', percentage: 51 },
      { label: '>= $5.0 Trillion', percentage: 24 }
    ]
  },
  {
    id: 'us-fed-rate-ladder',
    question: 'Target Fed Funds rate by end of 2026?',
    category: 'Economics',
    marketType: 'LADDER',
    yes: 65,
    volume: '$22.0m',
    liquidity: '$7.4m',
    participants: '11.5K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(37, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&auto=format&fit=crop&q=80',
    icon: 'FED',
    accent: '#20c997',
    options: [
      { label: '<= 4.75%', percentage: 89 },
      { label: '<= 4.50%', percentage: 65 },
      { label: '<= 4.25%', percentage: 38 },
      { label: '<= 4.00%', percentage: 16 }
    ]
  },

  // --- RANGE MARKETS ---
  {
    id: 'xrp-range',
    question: 'XRP price between $1.05 - $1.20 on July 25?',
    category: 'Crypto',
    marketType: 'RANGE',
    yes: 55,
    volume: '$3.6m',
    liquidity: '$1.2m',
    participants: '8.9K',
    timeLeft: '25 Jul · 23:59',
    trend: 'up',
    chart: series(21, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=200&auto=format&fit=crop&q=80',
    icon: 'XRP',
    accent: '#23f7dd',
    options: [
      { label: '< $1.05', percentage: 18 },
      { label: '$1.05 - $1.20', percentage: 55 },
      { label: '$1.20 - $1.35', percentage: 21 },
      { label: '> $1.35', percentage: 6 }
    ]
  },
  {
    id: 'btc-range-q3',
    question: 'BTC average price range in Q3 2026?',
    category: 'Crypto',
    marketType: 'RANGE',
    yes: 48,
    volume: '$19.2m',
    liquidity: '$5.8m',
    participants: '14.2K',
    timeLeft: 'Sep 30, 2026',
    trend: 'up',
    chart: series(23, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    icon: 'BTC',
    accent: '#f7931a',
    options: [
      { label: '$85K - $95K', percentage: 15 },
      { label: '$95K - $110K', percentage: 48 },
      { label: '$110K - $125K', percentage: 29 },
      { label: 'Above $125K', percentage: 8 }
    ]
  },
  {
    id: 'eth-btc-ratio-range',
    question: 'ETH/BTC ratio range in Q3 2026?',
    category: 'Crypto',
    marketType: 'RANGE',
    yes: 42,
    volume: '$8.4m',
    liquidity: '$2.6m',
    participants: '6.3K',
    timeLeft: 'Sep 30, 2026',
    trend: 'up',
    chart: series(25, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=200&auto=format&fit=crop&q=80',
    icon: 'ETH',
    accent: '#627eea',
    options: [
      { label: '< 0.040', percentage: 22 },
      { label: '0.040 - 0.055', percentage: 42 },
      { label: '0.055 - 0.070', percentage: 28 },
      { label: '> 0.070', percentage: 8 }
    ]
  },
  {
    id: 'fed-inflation-range',
    question: 'US Annual CPI Inflation rate in Q4 2026?',
    category: 'Economics',
    marketType: 'RANGE',
    yes: 54,
    volume: '$11.6m',
    liquidity: '$3.8m',
    participants: '7.9K',
    timeLeft: 'Dec 31, 2026',
    trend: 'down',
    chart: series(27, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&auto=format&fit=crop&q=80',
    icon: 'CPI',
    accent: '#3b82f6',
    options: [
      { label: '1.5% - 2.2%', percentage: 24 },
      { label: '2.2% - 2.8%', percentage: 54 },
      { label: '2.8% - 3.5%', percentage: 17 },
      { label: 'Above 3.5%', percentage: 5 }
    ]
  },
  {
    id: 'gold-price-range',
    question: 'Gold price per ounce in Q4 2026?',
    category: 'Finance',
    marketType: 'RANGE',
    yes: 46,
    volume: '$9.1m',
    liquidity: '$2.9m',
    participants: '6.7K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(29, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=200&auto=format&fit=crop&q=80',
    icon: 'GOLD',
    accent: '#fbbf24',
    options: [
      { label: '< $2,800', percentage: 12 },
      { label: '$2,800 - $3,200', percentage: 46 },
      { label: '$3,200 - $3,600', percentage: 33 },
      { label: '> $3,600', percentage: 9 }
    ]
  },

  // --- DATE MARKETS ---
  {
    id: 'openai-gpt6-date',
    question: 'When will OpenAI release GPT-6?',
    category: 'Tech',
    marketType: 'DATE',
    yes: 61,
    volume: '$10.2m',
    liquidity: '$3.4m',
    participants: '2.7K',
    timeLeft: 'Dec 31, 2027',
    trend: 'up',
    chart: series(42, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=200&auto=format&fit=crop&q=80',
    accent: '#10a37f',
    options: [
      { label: 'July - Sep 2026', percentage: 12 },
      { label: 'Oct - Dec 2026', percentage: 48 },
      { label: 'Jan - Mar 2027', percentage: 26 },
      { label: 'Apr - Jun 2027', percentage: 11 },
      { label: 'After Jun 2027', percentage: 3 }
    ]
  },
  {
    id: 'xrp-date',
    question: 'XRP price on July 31, 2026?',
    category: 'Crypto',
    marketType: 'DATE',
    yes: 62,
    volume: '$8.1m',
    liquidity: '$2.9m',
    participants: '11.7K',
    timeLeft: '31 Jul 2026 · 00:00 UTC',
    trend: 'up',
    chart: series(30, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=200&auto=format&fit=crop&q=80',
    icon: 'XRP',
    accent: '#23f7dd',
    options: [
      { label: 'Above $1.50', percentage: 62 },
      { label: '$1.00 - $1.50', percentage: 28 },
      { label: 'Below $1.00', percentage: 10 }
    ]
  },
  {
    id: 'spacex-mars-uncrewed-date',
    question: 'Date of first uncrewed SpaceX Starship Mars landing attempt?',
    category: 'Tech',
    marketType: 'DATE',
    yes: 42,
    volume: '$14.6m',
    liquidity: '$4.2m',
    participants: '9.8K',
    timeLeft: 'Dec 31, 2028',
    trend: 'up',
    chart: series(44, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=200&auto=format&fit=crop&q=80',
    icon: 'SPX',
    accent: '#ef4444',
    options: [
      { label: 'Q4 2026', percentage: 14 },
      { label: 'Q1 - Q2 2027', percentage: 42 },
      { label: 'Q3 - Q4 2027', percentage: 31 },
      { label: '2028 or later', percentage: 13 }
    ]
  },
  {
    id: 'us-solana-etf-date',
    question: 'Approval date for first US spot Solana ETF?',
    category: 'Crypto',
    marketType: 'DATE',
    yes: 54,
    volume: '$18.2m',
    liquidity: '$5.6m',
    participants: '12.4K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(46, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80',
    icon: 'SOL',
    accent: '#14f195',
    options: [
      { label: 'Q3 2026', percentage: 22 },
      { label: 'Q4 2026', percentage: 54 },
      { label: 'Q1 2027', percentage: 18 },
      { label: 'Later than Q1 2027', percentage: 6 }
    ]
  },
  {
    id: 'fed-50bps-cut-date',
    question: 'Date of next 50bps Fed interest rate cut?',
    category: 'Economics',
    marketType: 'DATE',
    yes: 38,
    volume: '$16.9m',
    liquidity: '$5.1m',
    participants: '8.7K',
    timeLeft: 'Dec 31, 2026',
    trend: 'down',
    chart: series(48, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&auto=format&fit=crop&q=80',
    icon: 'FED',
    accent: '#20c997',
    options: [
      { label: 'September 2026', percentage: 38 },
      { label: 'November 2026', percentage: 34 },
      { label: 'December 2026', percentage: 20 },
      { label: 'In 2027 or later', percentage: 8 }
    ]
  },

  // --- THRESHOLD MARKETS ---
  {
    id: 'eth-exceed-5000',
    question: 'Will ETH exceed $5,000 before Dec 31, 2026?',
    category: 'Crypto',
    marketType: 'THRESHOLD',
    yes: 47,
    volume: '$15.6m',
    liquidity: '$5.2m',
    participants: '7.2K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(15, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1bd?w=200&auto=format&fit=crop&q=80',
    icon: 'ETH',
    accent: '#627eea',
  },
  {
    id: 'sol-ath-2025',
    question: 'Will Solana break its all-time high before Nov 2026?',
    category: 'Crypto',
    marketType: 'THRESHOLD',
    yes: 78,
    volume: '$34.2m',
    liquidity: '$11.8m',
    participants: '15.4K',
    timeLeft: 'Nov 2026',
    trend: 'up',
    chart: series(22, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80',
    accent: '#14f195',
  },
  {
    id: 'xrp-threshold',
    question: 'XRP above $1.20 anytime on July 25?',
    category: 'Crypto',
    marketType: 'THRESHOLD',
    yes: 38,
    volume: '$2.8m',
    liquidity: '$910K',
    participants: '6.2K',
    timeLeft: '25 Jul · 23:59',
    trend: 'down',
    chart: series(14, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=200&auto=format&fit=crop&q=80',
    icon: 'XRP',
    accent: '#23f7dd',
  },
  {
    id: 'btc-cross-150k',
    question: 'Will Bitcoin cross $150,000 before Oct 2026?',
    category: 'Crypto',
    marketType: 'THRESHOLD',
    yes: 62,
    volume: '$42.1m',
    liquidity: '$14.3m',
    participants: '21.5K',
    timeLeft: 'Oct 31, 2026',
    trend: 'up',
    chart: series(16, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    icon: 'BTC',
    accent: '#f7931a',
  },
  {
    id: 'base-daily-tx-10m',
    question: 'Will Base Network reach 10M daily transactions before 2027?',
    category: 'Crypto',
    marketType: 'THRESHOLD',
    yes: 71,
    volume: '$11.4m',
    liquidity: '$3.6m',
    participants: '8.3K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(18, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format&fit=crop&q=80',
    icon: 'BASE',
    accent: '#0052ff',
  },
  {
    id: 'tsla-fsd-unsupervised',
    question: 'Will Tesla receive unsupervised FSD approval in CA before Q4?',
    category: 'Tech',
    marketType: 'THRESHOLD',
    yes: 34,
    volume: '$8.9m',
    liquidity: '$2.8m',
    participants: '6.1K',
    timeLeft: 'Sep 30, 2026',
    trend: 'down',
    chart: series(20, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
    icon: 'TSLA',
    accent: '#e82127',
  },

  // --- MULTIPLE CHOICE MARKETS ---
  {
    id: 'fed-decision-july',
    question: 'Fed Decision in July?',
    category: 'Economics',
    marketType: 'MULTIPLE_CHOICE',
    yes: 71,
    volume: '$91.7m',
    liquidity: '$28.2m',
    participants: '8.3K',
    timeLeft: 'Ends Jul 29, 07:00',
    trend: 'up',
    chart: series(8, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&auto=format&fit=crop&q=80',
    icon: 'FED',
    accent: '#20c997',
    options: [
      { label: 'No change', percentage: 71 },
      { label: '25 bps cut', percentage: 22 },
      { label: '50+ bps cut', percentage: 7 }
    ]
  },
  {
    id: 'premier-league-winner-2026',
    question: 'Who will win the Premier League 2025/2026 season?',
    category: 'Sports',
    marketType: 'MULTIPLE_CHOICE',
    yes: 46,
    volume: '$16.4m',
    liquidity: '$5.1m',
    participants: '11.2K',
    timeLeft: 'May 24, 2026',
    trend: 'up',
    chart: series(10, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
    icon: 'EPL',
    accent: '#38003c',
    options: [
      { label: 'Manchester City', percentage: 46 },
      { label: 'Arsenal FC', percentage: 32 },
      { label: 'Liverpool FC', percentage: 16 },
      { label: 'Chelsea FC', percentage: 6 }
    ]
  },
  {
    id: 'f1-champion-driver-2026',
    question: 'Formula 1 2026 Drivers Championship Winner?',
    category: 'Sports',
    marketType: 'MULTIPLE_CHOICE',
    yes: 54,
    volume: '$12.1m',
    liquidity: '$3.8m',
    participants: '9.3K',
    timeLeft: 'Nov 29, 2026',
    trend: 'up',
    chart: series(12, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=200&auto=format&fit=crop&q=80',
    icon: 'F1',
    accent: '#e10600',
    options: [
      { label: 'Max Verstappen', percentage: 54 },
      { label: 'Lando Norris', percentage: 24 },
      { label: 'Lewis Hamilton', percentage: 14 },
      { label: 'Charles Leclerc', percentage: 8 }
    ]
  },
  {
    id: 'us-tech-regulation-2026',
    question: 'Dominant US Tech Policy enacted in 2026?',
    category: 'Tech',
    marketType: 'MULTIPLE_CHOICE',
    yes: 42,
    volume: '$7.8m',
    liquidity: '$2.3m',
    participants: '5.4K',
    timeLeft: 'Dec 31, 2026',
    trend: 'up',
    chart: series(14, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=200&auto=format&fit=crop&q=80',
    icon: 'TECH',
    accent: '#3b82f6',
    options: [
      { label: 'Federal Crypto Sandbox Act', percentage: 42 },
      { label: 'AI Open Source Shield Bill', percentage: 31 },
      { label: 'Algorithmic Safety Audit Standard', percentage: 19 },
      { label: 'Cross-Border Data Privacy Compact', percentage: 8 }
    ]
  },

  // --- UP OR DOWN MARKETS ---
  {
    id: 'btc-up-down-direction',
    question: 'Bitcoin Up or Down today?',
    category: 'Crypto',
    marketType: 'UP_OR_DOWN',
    yes: 51,
    volume: '$28.4m',
    liquidity: '$9.2m',
    participants: '12.1K',
    timeLeft: 'Ends in 2h 45m',
    trend: 'up',
    chart: series(3, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    icon: 'BTC',
    accent: '#f7931a',
  },
  {
    id: 'btc-above-70k-july',
    question: 'Bitcoin above $70,000 on July 24?',
    category: 'Crypto',
    marketType: 'UP_OR_DOWN',
    yes: 51,
    volume: '$18.4m',
    liquidity: '$6.2m',
    participants: '28.3K',
    timeLeft: '24 Jul · 07:00 AM',
    trend: 'up',
    chart: series(3, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    icon: 'BTC',
    accent: '#f7931a',
  },
  {
    id: 'brazil-copa',
    question: 'Will Brazil win the FIFA World Cup 2026?',
    category: 'Sports',
    marketType: 'UP_OR_DOWN',
    yes: 48,
    volume: '$6.2m',
    liquidity: '$1.8m',
    participants: '9.1K',
    timeLeft: '15 Jun 2026',
    trend: 'down',
    chart: series(41, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
    icon: 'BR',
    accent: '#febe10',
  },
  {
    id: 'cpi-economy',
    question: 'US CPI above 3% in July?',
    category: 'Economics',
    marketType: 'UP_OR_DOWN',
    yes: 37,
    volume: '$3.8m',
    liquidity: '$1.1m',
    participants: '5.3K',
    timeLeft: '31 Jul · 08:30 AM',
    trend: 'down',
    chart: series(52, false),
    verified: true,
    image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=200&auto=format&fit=crop&q=80',
    icon: 'CPI',
    accent: '#3b82f6',
  },
  {
    id: 'nvda-stocks',
    question: 'NVIDIA above $150 on Aug 15?',
    category: 'Finance',
    marketType: 'UP_OR_DOWN',
    yes: 55,
    volume: '$2.3m',
    liquidity: '$690K',
    participants: '4.2K',
    timeLeft: '15 Aug · 07:00 AM',
    trend: 'up',
    chart: series(63, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80',
    icon: 'NVDA',
    accent: '#76b900',
  },
  {
    id: 'apple-5t',
    question: 'Apple market cap reaches $5T',
    category: 'Finance',
    marketType: 'UP_OR_DOWN',
    yes: 68,
    volume: '$3.1m',
    liquidity: '$930K',
    participants: '5.2K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(20, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=200&auto=format&fit=crop&q=80',
    icon: 'AAPL',
    accent: '#a1a1a1',
  },
  {
    id: 'msft-700',
    question: 'Microsoft above $700/share',
    category: 'Finance',
    marketType: 'UP_OR_DOWN',
    yes: 71,
    volume: '$2.8m',
    liquidity: '$840K',
    participants: '4.8K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(21, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1633419461186-7d40a38105ec?w=200&auto=format&fit=crop&q=80',
    icon: 'MSFT',
    accent: '#00a4ef',
  },
  {
    id: 'tesla-500',
    question: 'Tesla above $500/share before end of 2026',
    category: 'Finance',
    marketType: 'UP_OR_DOWN',
    yes: 52,
    volume: '$2.2m',
    liquidity: '$660K',
    participants: '4.1K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(23, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
    icon: 'TSLA',
    accent: '#e82127',
  },
  {
    id: 'gpt6-release',
    question: 'OpenAI releases GPT-6 in 2026',
    category: 'AI',
    marketType: 'UP_OR_DOWN',
    yes: 64,
    volume: '$2.7m',
    liquidity: '$810K',
    participants: '4.9K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(30, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?w=200&auto=format&fit=crop&q=80',
    icon: 'GPT',
    accent: '#10a37f',
  },
  {
    id: 'gemini-ultra',
    question: 'Google Gemini Ultra surpasses GPT benchmark',
    category: 'AI',
    marketType: 'UP_OR_DOWN',
    yes: 53,
    volume: '$1.9m',
    liquidity: '$570K',
    participants: '3.8K',
    timeLeft: '30 Jun 2026',
    trend: 'up',
    chart: series(31, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=80',
    icon: 'GEM',
    accent: '#4285f4',
  },
  {
    id: 'ai-market-1t',
    question: 'Global AI market exceeds $1 trillion',
    category: 'AI',
    marketType: 'UP_OR_DOWN',
    yes: 82,
    volume: '$3.4m',
    liquidity: '$1.02m',
    participants: '6.1K',
    timeLeft: '31 Dec 2027',
    trend: 'up',
    chart: series(38, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=80',
    icon: 'MKT',
    accent: '#10b981',
  },
  {
    id: 'gold-4000',
    question: 'Gold price above $4,000 per ounce',
    category: 'Finance',
    marketType: 'UP_OR_DOWN',
    yes: 72,
    volume: '$2.2m',
    liquidity: '$660K',
    participants: '4.5K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(18, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=200&auto=format&fit=crop&q=80',
    icon: 'AU',
    accent: '#fbbf24',
  },
  {
    id: 'solar-exceeds-coal',
    question: 'Solar energy generation exceeds coal globally',
    category: 'Climate',
    marketType: 'UP_OR_DOWN',
    yes: 66,
    volume: '$2.0m',
    liquidity: '$600K',
    participants: '3.9K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(43, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200&auto=format&fit=crop&q=80',
    icon: 'SOLAR',
    accent: '#fbbf24',
  },
  {
    id: 'ev-sales-50pct',
    question: 'EV sales exceed 50% of new global car sales',
    category: 'Tech',
    marketType: 'UP_OR_DOWN',
    yes: 58,
    volume: '$1.9m',
    liquidity: '$570K',
    participants: '3.7K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(44, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=200&auto=format&fit=crop&q=80',
    icon: 'EV',
    accent: '#10b981',
  },
  {
    id: 'real-madrid-ucl',
    question: 'Real Madrid wins UEFA Champions League',
    category: 'Sports',
    marketType: 'UP_OR_DOWN',
    yes: 45,
    volume: '$1.8m',
    liquidity: '$540K',
    participants: '3.6K',
    timeLeft: '31 May 2026',
    trend: 'up',
    chart: series(50, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
    icon: 'RM',
    accent: '#ffffff',
  },
  {
    id: 'ronaldo-1000-goals',
    question: 'Cristiano Ronaldo reaches 1,000 career goals',
    category: 'Sports',
    marketType: 'UP_OR_DOWN',
    yes: 58,
    volume: '$1.5m',
    liquidity: '$450K',
    participants: '3.1K',
    timeLeft: '31 Dec 2026',
    trend: 'up',
    chart: series(59, true),
    verified: true,
    image: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=200&auto=format&fit=crop&q=80',
    icon: 'CR7',
    accent: '#ef4444',
  }
];

export const FEATURED = {
  tag: 'FEATURED EVENT',
  title: 'FIFA World Cup 2026',
  subtitle: 'Who will win the FIFA World Cup 2026?',
  cta: 'Trade Now',
}

export const OPEN_POSITIONS = [
  {
    id: 'btc-200k',
    question: 'BTC to reach $200K by Dec 31, 2025?',
    side: 'Yes',
    prob: 62,
    value: '$680.00',
    pnl: '+12.20%',
    up: true,
    meta: '3d left · 120.0 shares',
  },
  {
    id: 'eth-etf',
    question: 'ETH ETF approved by May 2024?',
    side: 'Yes',
    prob: 41,
    value: '$320.00',
    pnl: '+8.10%',
    up: true,
    meta: '12d left · 80.0 shares',
  },
]

export const RECENT_ACTIVITY = [
  {
    label: 'Bought Yes · BTC to $200K',
    time: '2m ago',
    amount: '-10.00 USDC',
    up: false,
  },
  {
    label: 'Sold No · SOL to $300',
    time: '1h ago',
    amount: '+15.20 USDC',
    up: true,
  },
  {
    label: 'Deposit · Wallet top-up',
    time: '5h ago',
    amount: '+250.00 USDC',
    up: true,
  },
]

export const SOURCES = [
  { name: 'CoinDesk', time: '2h ago' },
  { name: 'Bloomberg', time: '5h ago' },
  { name: 'NewsBTC', time: '1d ago' },
]
