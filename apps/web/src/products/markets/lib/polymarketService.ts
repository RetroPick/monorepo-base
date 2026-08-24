import { type Market, type MarketOption } from "./retropickData";

export type MarketCategoryEnum = Market['category'];

const PRIORITY_ORDER: MarketCategoryEnum[] = [
  'Crypto',
  'AI',
  'Economics',
  'Sports',
  'Financials',
  'Finance',
  'Tech',
  'Climate',
  'Science',
];

const POLITICAL_KEYWORDS = [
  'trump', 'biden', 'pardon', 'president', 'presidential', 'election',
  'senate', 'governor', 'congress', 'democrat', 'republican', 'harris',
  'vance', 'putin', 'zelensky', 'cabinet', 'impeach', 'politician',
  'political', 'politi', 'elect', 'supreme court', 'white house', 'parliament',
  'prime minister', 'government', 'midterms', 'midterm', 'likud', 'gaza', 'ceasefire',
  'israel', 'iran', 'palestine', 'middle east', 'nato', 'un security council', 'balance of power',
  'us election', 'primaries', 'caucus', 'vote', 'voting', 'dan sullivan', 'eli cohen',
  'luxon', 'starmer', 'macron', 'blockade', 'war', 'clarity act'
];

export function isPoliticalEvent(textOrEvent: any): boolean {
  if (!textOrEvent) return false;
  const str = typeof textOrEvent === 'string'
    ? textOrEvent
    : `${textOrEvent.title || ''} ${textOrEvent.question || ''} ${textOrEvent.category || ''} ${textOrEvent.slug || ''}`;
  const lower = str.toLowerCase();
  if (lower.includes('politics') || lower.includes('geopolitics')) return true;
  return POLITICAL_KEYWORDS.some(kw => lower.includes(kw));
}

const KEYWORD_MAP: Record<Exclude<MarketCategoryEnum, undefined>, string[]> = {
  Crypto: [
    'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'xrp', 'ripple',
    'base chain', 'base network', 'arbitrum', 'optimism', 'zksync', 'defi', 'dex',
    'jupiter', 'raydium', 'orca', 'memecoin', 'doge', 'cardano', 'ada',
    'altcoin', 'airdrop', 'layer 2', 'l2', 'crypto', 'web3', 'sui', 'aptos'
  ],
  Sports: [
    'wta', 'atp', 'tennis', 'premier league', 'champions league',
    "ballon d'or", 'ballon dor', 'mlb', 'cpbl', 'nba', 'nfl', 'f1', 'formula 1',
    'ufc', 'mma', 'golf', 'boxing', 'cricket', 'dota 2', 'league of legends',
    'valorant', 'cs2', 'csgo', 'esports', 'esport', 'match', 'goal', 'playoff',
    'quarterback', 'home run', 'grand slam', 'world cup', 'olympics', 'aaron judge',
    'yankees', 'dodgers', 'lakers', 'celtics', 'eagles', 'chiefs', 'haaland',
    'messi', 'ronaldo', 'mbappe', 'verstappen', 'hamilton', 'norris', 'leclerc',
    'costoulas', 'inglis', 'kozyreva', 'lumsden', 'chan', 'joint', 'djokovic',
    'alcaraz', 'sinner', 'swiatek', 'sabalenka', 'gauff', 'medvedev', 'zverev',
    'rampage', 'first blood', 'exact score', 'completed match', 'vs', 'soccer', 'football'
  ],
  Finance: [
    's&p 500', 's&p500', 'spx', 'nasdaq', 'dow jones', 'stock price', 'share price',
    'nvidia', 'nvda', 'apple inc', 'apple', 'aapl', 'microsoft', 'msft',
    'amazon', 'amzn', 'meta platforms', 'meta', 'samsung', 'gold price', 'silver price',
    'jpmorgan', 'goldman sachs', 'blackrock', 'blk', 'ipo', 'earnings report',
    'market cap', 'wall street', 'stock', 'stocks'
  ],
  Financials: [
    's&p 500', 's&p500', 'spx', 'nasdaq', 'dow jones', 'stock price', 'share price',
    'nvidia', 'nvda', 'apple inc', 'apple', 'aapl', 'microsoft', 'msft',
    'amazon', 'amzn', 'meta platforms', 'meta', 'samsung', 'gold price', 'silver price',
    'jpmorgan', 'goldman sachs', 'blackrock', 'blk', 'ipo', 'earnings report',
    'market cap', 'wall street', 'stock', 'stocks'
  ],
  Tech: [
    'tesla', 'byd', 'xiaomi auto', 'volkswagen', 'rivian', 'ev sales', 'evs', 'electric vehicle',
    'spacex', 'starship', 'nasa', 'mars mission', 'tsmc', 'intel', 'amd',
    'qualcomm', 'quantum computing', 'cybersecurity', 'chip', 'chips', 'semiconductor'
  ],
  AI: [
    'openai', 'chatgpt', 'gpt-4', 'gpt-5', 'gpt-6', 'gpt', 'gemini', 'anthropic', 'claude',
    'grok', 'xai', 'deepseek', 'llm', 'large language model', 'ai robotics',
    'artificial intelligence', 'robotics', 'asta'
  ],
  Economics: [
    'federal reserve', 'fed funds', 'fed', 'fomc', 'jerome powell', 'powell',
    'inflation', 'cpi', 'gdp', 'unemployment rate', 'unemployment',
    'interest rate cut', 'interest rate hike', 'interest rate', 'rate cut'
  ],
  Climate: [
    'global warming', 'co2 emissions', 'sea level', 'solar power',
    'wind energy', 'renewable energy', 'climate change', 'carbon', 'climate', 'green energy'
  ],
  Science: ['space', 'physics', 'biology', 'medicine'],
  Stocks: ['shares', 'equity', 'nasdaq', 'nyse']
};

export function classifyMarketCategory(
  question: string = '',
  originalCat: string = '',
  tagSlugs: string[] = [],
  eventTitle: string = '',
  slug: string = ''
): Market['category'] {
  const haystack = `${question.toLowerCase()} ${eventTitle.toLowerCase()} ${slug.toLowerCase().replace(/-/g, ' ')}`;

  const scores: Record<MarketCategoryEnum, number> = {
    Sports: 0,
    Crypto: 0,
    AI: 0,
    Climate: 0,
    Economics: 0,
    Tech: 0,
    Finance: 0,
    Financials: 0,
    Science: 0,
    Stocks: 0,
  };

  // Check Head to head or score pattern for sports booster (+5 pts)
  const isHeadToHead = /\bvs\.?\b/i.test(haystack) || /\b\d+\s*[-–]\s*\d+\b/.test(haystack);
  if (isHeadToHead) {
    scores.Sports += 5;
  }

  // 1. Skor dari keyword matching di question/title/slug (+3 pts per keyword match)
  for (const [categoryKey, keywords] of Object.entries(KEYWORD_MAP)) {
    const category = categoryKey as MarketCategoryEnum;
    for (const kw of keywords) {
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\b${escapedKw}\\b`, 'i');
      if (pattern.test(haystack)) {
        scores[category] += 3;
      }
    }
  }

  // 2. Skor tambahan dari tag Polymarket mentah (+1 pt per matching tag)
  const allTags = [...tagSlugs, originalCat].map((t) => (t || '').toLowerCase());
  for (const tag of allTags) {
    for (const [categoryKey] of Object.entries(KEYWORD_MAP)) {
      const category = categoryKey as MarketCategoryEnum;
      if (category.toLowerCase() === tag) {
        scores[category] += 1;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores))
  if (maxScore === 0) {
    return 'Finance'
  }

  const topCandidates = (Object.keys(scores) as MarketCategoryEnum[]).filter(
    (cat) => scores[cat] === maxScore
  )

  // Tie-break pakai PRIORITY_ORDER
  for (const priorityCategory of PRIORITY_ORDER) {
    if (topCandidates.includes(priorityCategory)) {
      return priorityCategory
    }
  }

  return topCandidates[0] || 'Finance'
}

export function extractSubTags(
  question: string = '',
  category: Market['category'] = 'Finance',
  originalCat: string = '',
  tagSlugs: string[] = []
): string[] {
  const q = question.toLowerCase()
  const result: string[] = [category]

  let specificSubTag: string | null = null

  // 1. SPORTS SUB-TAGS
  if (category === 'Sports' || q.includes(' vs') || q.includes(' vs.') || q.includes('vs.') || /\b\d+\s*[-–]\s*\d+\b/.test(q)) {
    if (/\b(tennis|wta|atp|wimbledon|french open|us open|australian open|costoulas|inglis|kozyreva|lumsden|chan|joint|djokovic|alcaraz|sinner|swiatek|sabalenka|gauff|medvedev|zverev|vancouver)\b/i.test(q)) {
      specificSubTag = 'Tennis'
    } else if (/\b(esport|esports|rampage|game \d|map \d|dota|league of legends|lol|valorant|csgo|cs2)\b/i.test(q)) {
      specificSubTag = 'eSports'
    } else if (/\b(golf|pga|masters)\b/i.test(q)) {
      specificSubTag = 'Golf'
    } else if (/\b(boxing|boxer|fury|usyk|canelo)\b/i.test(q)) {
      specificSubTag = 'Boxing'
    } else if (/\b(cricket|ipl|t20)\b/i.test(q)) {
      specificSubTag = 'Cricket'
    } else if (/\b(f1|formula 1|formula one|verstappen|norris|hamilton|leclerc|grand prix)\b/i.test(q)) {
      specificSubTag = 'Formula 1'
    } else if (/\b(baseball|mlb|cpbl|yankees|dodgers|red sox|monkeys|guardians|home run|aaron judge)\b/i.test(q)) {
      specificSubTag = 'Baseball'
      if (/\b(cpbl|monkeys|guardians)\b/i.test(q)) specificSubTag = 'CPBL'
      if (/\b(mlb|yankees|dodgers|home run|aaron judge)\b/i.test(q)) specificSubTag = 'MLB'
    } else if (/\b(basketball|nba|lakers|celtics|warriors)\b/i.test(q)) {
      specificSubTag = 'NBA'
    } else if (/\b(ufc|mma)\b/i.test(q)) {
      specificSubTag = 'MMA / UFC'
    } else if (/\b(nrl|rugby|queensland cowboys|sydney roosters|broncos|storm|panthers|parramatta)\b/i.test(q)) {
      specificSubTag = 'Rugby'
    } else if (/\b(nfl|super bowl|dallas cowboys|kansas city chiefs|eagles|patriots|packers|49ers|touchdown|quarterback|nfl draft)\b/i.test(q)) {
      specificSubTag = 'NFL'
    } else if (/\b(soccer|football|epl|premier league|champions league|real madrid|barcelona|arsenal|chelsea|manchester|bayern|psg|fc|cd|ballon d'or|ballon dor|haaland|messi|ronaldo|mbappe)\b/i.test(q)) {
      specificSubTag = 'Soccer'
    } else {
      specificSubTag = 'Sports'
    }
  }

  // 2. CRYPTO SUB-TAGS
  else if (category === 'Crypto' || /\b(btc|bitcoin|eth|ethereum|sol|solana|xrp|ripple)\b/i.test(q)) {
    if (/\b(bitcoin|btc)\b/i.test(q)) {
      specificSubTag = /\bbtc\b/i.test(q) ? 'BTC' : 'Bitcoin'
    } else if (/\b(ethereum|eth)\b/i.test(q)) {
      specificSubTag = /\beth\b/i.test(q) ? 'ETH' : 'Ethereum'
    } else if (/\b(solana|sol)\b/i.test(q)) {
      specificSubTag = /\bsol\b/i.test(q) ? 'SOL' : 'Solana'
    } else if (/\b(xrp|ripple)\b/i.test(q)) {
      specificSubTag = 'XRP'
    } else if (/\b(l2|layer2|base|arbitrum|optimism|zksync)\b/i.test(q)) {
      specificSubTag = 'Layer 2'
    } else if (/\b(dex|uniswap|jupiter|raydium)\b/i.test(q)) {
      specificSubTag = 'DeFi & DEX'
    }
  }

  // 3. FINANCE SUB-TAGS
  else if (category === 'Finance' || /\b(stock|stocks|s&p|sp500|blackrock|nvidia|apple|amazon|microsoft|meta|gold|bank)\b/i.test(q)) {
    if (/\b(blackrock|blk)\b/i.test(q)) {
      specificSubTag = 'Asset Management'
    } else if (/\b(nvidia|nvda)\b/i.test(q)) {
      specificSubTag = 'NVIDIA'
    } else if (/\b(apple|aapl)\b/i.test(q)) {
      specificSubTag = 'Apple'
    } else if (/\b(microsoft|msft)\b/i.test(q)) {
      specificSubTag = 'Microsoft'
    } else if (/\b(amazon|amzn)\b/i.test(q)) {
      specificSubTag = 'Amazon'
    } else if (/\b(meta|facebook)\b/i.test(q)) {
      specificSubTag = 'Meta'
    } else if (/\b(gold|silver|commodity)\b/i.test(q)) {
      specificSubTag = 'Gold & Commodities'
    } else if (/\b(bank|banking|jpmorgan)\b/i.test(q)) {
      specificSubTag = 'Banking'
    } else if (/\b(s&p|sp500|spx|nasdaq)\b/i.test(q)) {
      specificSubTag = 'Stock Indices'
    } else if (/\b(earnings|quarterly)\b/i.test(q)) {
      specificSubTag = 'Earnings'
    }
  }

  // 4. TECH SUB-TAGS
  else if (category === 'Tech' || /\b(ev|spacex|chip|chips|semiconductor|cybersecurity|quantum)\b/i.test(q)) {
    if (/\b(ev|evs|electric vehicle|car sales|automaker|byd)\b/i.test(q)) {
      specificSubTag = 'Electric Vehicles'
    } else if (/\b(spacex|starship|mars|nasa)\b/i.test(q)) {
      specificSubTag = 'Space & Aerospace'
    } else if (/\b(chip|chips|semiconductor|semiconductors)\b/i.test(q)) {
      specificSubTag = 'Hardware & Chips'
    } else if (/\b(cybersecurity|security|hack|ransomware)\b/i.test(q)) {
      specificSubTag = 'Cybersecurity'
    } else if (/\b(quantum|qubit)\b/i.test(q)) {
      specificSubTag = 'Quantum'
    }
  }

  // 5. AI SUB-TAGS
  else if (category === 'AI' || /\b(ai|gpt|openai|claude|gemini|grok|llm)\b/i.test(q)) {
    if (/\b(openai|chatgpt|gpt)\b/i.test(q)) {
      specificSubTag = /\bllm\b/i.test(q) ? 'LLM' : 'OpenAI'
    } else if (/\b(gemini|google)\b/i.test(q)) {
      specificSubTag = 'Google Gemini'
    } else if (/\b(claude|anthropic)\b/i.test(q)) {
      specificSubTag = 'Claude'
    }
  }

  // 6. ECONOMICS SUB-TAGS
  else if (category === 'Economics' || /\b(fed|cpi|inflation|rate|gdp)\b/i.test(q)) {
    if (/\bfomc\b/i.test(q)) {
      specificSubTag = 'FOMC'
    } else if (/\b(cpi|inflation)\b/i.test(q)) {
      specificSubTag = 'CPI & Inflation'
    } else if (/\b(fed|rate|powell|interest rate)\b/i.test(q)) {
      specificSubTag = 'Fed & Rates'
    }
  }

  if (specificSubTag && !result.includes(specificSubTag)) {
    result.push(specificSubTag)
  }

  return result
}

export async function fetchLivePolymarketMarkets(): Promise<Market[]> {
  // Direct Polymarket Gamma fallback only.
  //
  // The canonical BFF path (apps/backend → /api/v1/markets/events) is handled by
  // `@retropick/polymarket` in `marketsClient.ts`; this function is reached only
  // after that path already failed, so re-calling the BFF here would be redundant.

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const targetUrl = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=40&order=volume&ascending=false'
    const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl), { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const rawMarkets = Array.isArray(data) ? data : data?.markets || []

    const mapped = rawMarkets.map((m: any, idx: number): Market | null => {
      if (isPoliticalEvent(m)) return null;
      const qLower = (m.question || '').toLowerCase()
      const originalCat = (m.category || '').toLowerCase()
      const tagSlugs = (m.tags || []).map((t: any) => (t.slug || m.slug || '').toLowerCase())

      // 2. Parse outcomes
      const outcomes: string[] = (() => {
        try {
          return typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes || []
        } catch {
          return []
        }
      })()

      // 3. Parse outcome prices
      const outcomePrices: number[] = (() => {
        try {
          const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices || []
          return prices.map((p: any) => parseFloat(p) || 0)
        } catch {
          return []
        }
      })()

      // 4. Determine the primary Yes price
      const yesIndex = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes')
      const yesPrice = yesIndex >= 0 ? (outcomePrices[yesIndex] || 0) : (outcomePrices[0] || 0.5)
      const yesPercentage = Math.round(yesPrice * 100)

      // 5. Map category strictly using robust multi-signal classifier
      const category: Market['category'] = classifyMarketCategory(
        m.question,
        originalCat,
        tagSlugs,
        m.title || (m.events && m.events[0] && m.events[0].title) || '',
        m.slug || ''
      )

      // 6. Categorize marketType
      const isBinary = outcomes.length === 2 && outcomes.some(o => String(o).toLowerCase() === 'yes')
      let marketType: Market['marketType'] = 'DIRECTION'

      if (!isBinary && outcomes.length > 0) {
        if (qLower.includes('which') || qLower.includes('who') || qLower.includes('first')) {
          marketType = 'CONVERGENCE'
        } else if (qLower.includes('highest') || qLower.includes('target') || outcomes.some(o => String(o).includes('>='))) {
          marketType = 'LADDER'
        } else if (qLower.includes('when') || qLower.includes('date') || qLower.includes('by')) {
          marketType = 'DATE'
        } else if (qLower.includes('range') || qLower.includes('between')) {
          marketType = 'RANGE'
        } else {
          marketType = 'MULTIPLE_CHOICE'
        }
      } else {
        if (qLower.includes('when') || qLower.includes('date') || qLower.includes('month') || qLower.includes('by')) {
          marketType = 'DATE'
        } else if (qLower.includes('hit') || qLower.includes('reach') || qLower.includes('above') || qLower.includes('exceed') || qLower.includes('break')) {
          marketType = 'THRESHOLD'
        } else if (qLower.includes('move') || qLower.includes('24h') || qLower.includes('swing') || qLower.includes('volatility')) {
          marketType = 'VELOCITY'
        } else if (qLower.includes('between') || qLower.includes('range')) {
          marketType = 'RANGE'
        } else {
          marketType = 'DIRECTION'
        }
      }

      // 7. Format volume like "$91.7m"
      const volNum = parseFloat(m.volume) || 0
      let volumeStr = '$0'
      if (volNum >= 1000000) {
        volumeStr = `$${(volNum / 1000000).toFixed(1)}m`
      } else if (volNum >= 1000) {
        volumeStr = `$${(volNum / 1000).toFixed(0)}k`
      } else {
        volumeStr = `$${volNum.toFixed(0)}`
      }

      // 8. Format dynamic date
      let timeLeft = 'Ends Dec 31'
      if (m.endDate) {
        try {
          const date = new Date(m.endDate)
          timeLeft = `Ends ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        } catch {}
      }

      // 9. Map options (for multi-choice)
      let options: MarketOption[] | undefined = undefined
      if (!isBinary && outcomes.length > 0) {
        options = outcomes.map((o, oIdx) => ({
          label: o,
          percentage: Math.round((outcomePrices[oIdx] || 0) * 100)
        }))
      }

      // 10. Generate semi-realistic history chart ending at current yesPercentage
      const chartPoints: number[] = []
      let tempVal = 50
      const diff = yesPercentage - 50
      for (let i = 0; i < 24; i++) {
        tempVal += diff / 24 + Math.sin(i * 0.7 + idx) * 4
        chartPoints.push(Math.max(8, Math.min(92, Math.round(tempVal))))
      }
      chartPoints.push(yesPercentage)

      // 11. Generate simulated icon labels
      let icon = undefined
      if (qLower.includes('bitcoin') || qLower.includes('btc')) icon = 'BTC'
      else if (qLower.includes('ethereum') || qLower.includes('eth')) icon = 'ETH'
      else if (qLower.includes('solana') || qLower.includes('sol')) icon = 'SOL'
      else if (qLower.includes('fed') || qLower.includes('powell')) icon = 'FED'
      else if (qLower.includes('openai') || qLower.includes('gpt')) icon = 'OPENAI'
      else if (qLower.includes('xrp')) icon = 'XRP'

      // Extract official Polymarket event/person image URL
      const officialImage = m.image || m.icon || (m.events && m.events[0] && (m.events[0].image || m.events[0].icon)) || undefined

      return {
        id: m.id || m.slug || String(idx),
        question: m.question || 'Untitled Market',
        category,
        marketType,
        tags: extractSubTags(m.question || '', category, originalCat, tagSlugs),
        yes: yesPercentage,
        volume: volumeStr,
        liquidity: m.liquidity ? `$${(parseFloat(m.liquidity)/1000000).toFixed(1)}m` : '$0.0m',
        participants: `${(Math.floor(volNum / 20000) + 124).toLocaleString()} Traders`,
        timeLeft,
        trend: yesPercentage >= 50 ? 'up' : 'down',
        chart: chartPoints,
        verified: true,
        icon,
        image: officialImage,
        options
      }
    })

    return mapped.filter((m: any): m is Market => m !== null)
  } catch (error) {
    console.error('Failed to fetch live Polymarket markets:', error)
    return []
  }
}

/**
 * Fetch live timeseries price history from Polymarket CLOB
 */
export async function fetchPriceHistory(
  tokenId: string,
  interval: '1h' | '6h' | '1d' | '1w' | 'max' = '1d',
  fidelity: number = 60
): Promise<{ timestamp: number; price: number }[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    const url = `https://clob.polymarket.com/prices-history?market=${encodeURIComponent(tokenId)}&interval=${interval}&fidelity=${fidelity}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return []
    const data = await res.json()
    const history = data?.history || []
    return history.map((item: any) => ({
      timestamp: item.t,
      price: Math.round((parseFloat(item.p) || 0) * 100)
    }))
  } catch {
    return []
  }
}

/**
 * Fetch live midpoint price from Polymarket CLOB
 */
export async function fetchClobMidpoint(tokenId: string): Promise<number | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)
    const url = `https://clob.polymarket.com/midpoint?token_id=${encodeURIComponent(tokenId)}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return null
    const data = await res.json()
    const mid = parseFloat(data?.mid)
    return isNaN(mid) ? null : Math.round(mid * 100)
  } catch {
    return null;
  }
}

export interface MarketRulesDetail {
  summary: string
  contractType: string
  oracleSource: string
  settlementRule: string
  tieBreakRule: string
}

export function getDetailedMarketRules(market: { question?: string; category?: string; marketType?: string; description?: string; options?: any[] }): MarketRulesDetail {
  const q = (market?.question || '').toLowerCase()
  const cat = (market?.category || '').toLowerCase()
  const type = market?.marketType || 'UP_OR_DOWN'

  // 1. Determine Oracle Source based on Topic
  let oracleSource = 'UMA Optimistic Oracle & Official Venue Feeds'
  if (cat === 'crypto' || q.includes('btc') || q.includes('eth') || q.includes('sol') || q.includes('xrp')) {
    oracleSource = 'Binance / Coinbase Pro 1-Minute Candle Index & CoinGecko Verified Feeds'
  } else if (cat === 'sports' || q.includes('f1') || q.includes('nfl') || q.includes('baseball') || q.includes('soccer') || q.includes('nba') || q.includes('ufc')) {
    oracleSource = 'Official Sports Governing Bodies (FIA, NFL.com, MLB.com, FIFA, NBA.com, UFC Official)'
  } else if (cat === 'finance' || q.includes('blackrock') || q.includes('nvidia') || q.includes('apple') || q.includes('stock')) {
    oracleSource = 'SEC EDGAR Filings & NASDAQ / NYSE End-of-Day Official Close Index'
  } else if (cat === 'economics' || q.includes('fed') || q.includes('rate') || q.includes('cpi') || q.includes('inflation')) {
    oracleSource = 'US Federal Reserve FOMC Statements & Bureau of Labor Statistics (BLS) Data'
  } else if (cat === 'tech' || cat === 'ai' || q.includes('openai') || q.includes('spacex') || q.includes('ev')) {
    oracleSource = 'Official Company Press Releases & Verified Regulatory Filings'
  }

  // 2. Determine Contract Type & Settlement Rules based on Market Type
  if (type === 'UP_OR_DOWN') {
    return {
      contractType: 'Directional Binary Contract (Up / Down)',
      summary: market?.description || `This directional prediction market resolves based on the verified closing price or event outcome for "${market?.question}".`,
      oracleSource,
      settlementRule: `Resolves to YES ($1.00 USDC) if the target condition is met by expiration. Resolves to NO ($0.00 USDC) if condition is not met.`,
      tieBreakRule: `If the target value matches the threshold exactly at expiration, market resolves based on official index rounding rules or UMA resolution guidelines.`,
    }
  }

  if (type === 'MULTIPLE_CHOICE' || type === 'THRESHOLD') {
    const optionNames = market?.options ? market.options.map((o) => o.label).join(', ') : 'listed candidates'
    return {
      contractType: 'Multiple Choice Candidate Contract',
      summary: market?.description || `This multiple-choice market resolves to whichever candidate option (${optionNames}) satisfies the official resolution criteria first.`,
      oracleSource,
      settlementRule: `The winning candidate option pays out $1.00 USDC per share. All losing options pay out $0.00 USDC per share.`,
      tieBreakRule: `If multiple options meet criteria simultaneously, resolution is divided according to venue rules or deferred to UMA consensus.`,
    }
  }

  if (type === 'RANGE' || type === 'LADDER') {
    return {
      contractType: 'Bracketed Range / Ladder Contract',
      summary: market?.description || `This bracketed market resolves to the specific numerical bracket that contains the final verified closing metric for "${market?.question}".`,
      oracleSource,
      settlementRule: `The single bracket containing the final value pays $1.00 USDC. All other range brackets expire at $0.00 USDC.`,
      tieBreakRule: `Boundary values are assigned to the upper inclusive bracket as specified by primary index benchmarks.`,
    }
  }

  return {
    contractType: 'Event Resolution Contract',
    summary: market?.description || `This prediction market resolves based on official verified reports for "${market?.question}".`,
    oracleSource,
    settlementRule: `Winning outcome shares resolve at $1.00 USDC. Losing outcome shares resolve at $0.00 USDC.`,
    tieBreakRule: `Standard UMA Optimistic Oracle resolution rules apply in the event of ambiguity.`,
  }
}
