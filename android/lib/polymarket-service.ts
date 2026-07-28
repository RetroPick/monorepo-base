'use client'

import { type Market, type MarketOption } from './retropick-data'

export async function fetchLivePolymarketMarkets(): Promise<Market[]> {
  try {
    const targetUrl = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=15&order=volume&ascending=false'
    const response = await fetch('https://corsproxy.io/?' + encodeURIComponent(targetUrl))

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const markets = Array.isArray(data) ? data : data?.markets || []

    return markets.map((m: any, idx: number) => {
      // 1. Parse outcomes
      const outcomes: string[] = (() => {
        try {
          return typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes || []
        } catch {
          return []
        }
      })()

      // 2. Parse outcome prices
      const outcomePrices: number[] = (() => {
        try {
          const prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices || []
          return prices.map((p: any) => parseFloat(p) || 0)
        } catch {
          return []
        }
      })()

      // 3. Determine the primary Yes price
      const yesIndex = outcomes.findIndex((o) => String(o).toLowerCase() === 'yes')
      const yesPrice = yesIndex >= 0 ? (outcomePrices[yesIndex] || 0) : (outcomePrices[0] || 0.5)
      const yesPercentage = Math.round(yesPrice * 100)

      // 4. Map category slug
      let category = 'General'
      const originalCat = (m.category || '').toLowerCase()
      const tagSlugs = (m.tags || []).map((t: any) => (t.slug || '').toLowerCase())
      
      if (originalCat.includes('crypto') || tagSlugs.some((s: string) => s.includes('crypto') || s.includes('bitcoin') || s.includes('ethereum'))) {
        category = 'Crypto'
      } else if (originalCat.includes('eco') || originalCat.includes('fed') || originalCat.includes('finance') || tagSlugs.some((s: string) => s.includes('fed') || s.includes('inflation'))) {
        category = 'Economics'
      } else if (originalCat.includes('tech') || originalCat.includes('ai') || originalCat.includes('science') || tagSlugs.some((s: string) => s.includes('ai') || s.includes('gpt') || s.includes('tech'))) {
        category = 'Tech'
      } else if (originalCat.includes('sport') || tagSlugs.some((s: string) => s.includes('sport') || s.includes('nba') || s.includes('football'))) {
        category = 'Sport'
      } else if (originalCat.includes('climate') || originalCat.includes('weather') || tagSlugs.some((s: string) => s.includes('climate') || s.includes('temp'))) {
        category = 'Climate'
      }

      // 5. Categorize marketType
      const isBinary = outcomes.length === 2 && outcomes.some(o => String(o).toLowerCase() === 'yes')
      let marketType: Market['marketType'] = 'THRESHOLD'
      if (isBinary) {
        if (m.question?.toLowerCase().includes('will the price of') || m.question?.toLowerCase().includes('hit') || m.question?.toLowerCase().includes('reach')) {
          marketType = 'THRESHOLD'
        } else {
          marketType = 'UP_OR_DOWN'
        }
      } else {
        marketType = 'MULTIPLE_CHOICE'
      }

      // 6. Format volume like "$91.7m"
      const volNum = parseFloat(m.volume) || 0
      let volumeStr = '$0'
      if (volNum >= 1000000) {
        volumeStr = `$${(volNum / 1000000).toFixed(1)}m`
      } else if (volNum >= 1000) {
        volumeStr = `$${(volNum / 1000).toFixed(0)}k`
      } else {
        volumeStr = `$${volNum.toFixed(0)}`
      }

      // 7. Format dynamic date
      let timeLeft = 'Ends Dec 31'
      if (m.endDate) {
        try {
          const date = new Date(m.endDate)
          timeLeft = `Ends ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        } catch {}
      }

      // 8. Map options (for multi-choice)
      let options: MarketOption[] | undefined = undefined
      if (!isBinary && outcomes.length > 0) {
        options = outcomes.map((o, oIdx) => ({
          label: o,
          percentage: Math.round((outcomePrices[oIdx] || 0) * 100)
        }))
      }

      // 9. Generate semi-realistic history chart ending at current yesPercentage
      const chartPoints: number[] = []
      let tempVal = 50
      const diff = yesPercentage - 50
      for (let i = 0; i < 24; i++) {
        tempVal += diff / 24 + Math.sin(i * 0.7 + idx) * 4
        chartPoints.push(Math.max(8, Math.min(92, Math.round(tempVal))))
      }
      chartPoints.push(yesPercentage)

      // 10. Generate simulated icon labels
      let icon = undefined
      const qLower = (m.question || '').toLowerCase()
      if (qLower.includes('bitcoin') || qLower.includes('btc')) icon = 'BTC'
      else if (qLower.includes('ethereum') || qLower.includes('eth')) icon = 'ETH'
      else if (qLower.includes('solana') || qLower.includes('sol')) icon = 'SOL'
      else if (qLower.includes('fed') || qLower.includes('powell')) icon = 'FED'
      else if (qLower.includes('openai') || qLower.includes('gpt')) icon = 'OPENAI'
      else if (qLower.includes('xrp')) icon = 'XRP'

      return {
        id: m.id || m.slug || String(idx),
        question: m.question || 'Untitled Market',
        category,
        marketType,
        yes: yesPercentage,
        volume: volumeStr,
        liquidity: m.liquidity ? `$${(parseFloat(m.liquidity)/1000000).toFixed(1)}m` : undefined,
        participants: `${(Math.floor(volNum / 20000) + 124).toLocaleString()} Traders`,
        timeLeft,
        trend: yesPercentage >= 50 ? 'up' : 'down',
        chart: chartPoints,
        verified: true,
        icon,
        image: m.image || m.icon || undefined,
        options
      }
    })
  } catch (error) {
    console.error('Failed to fetch live Polymarket markets:', error)
    return []
  }
}
