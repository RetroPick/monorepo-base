'use client'

import { useEffect, useState } from 'react'
import type { Market } from '@/lib/retropick-data'
import { TopBar } from './top-bar'
import { BottomNav, type Tab } from './bottom-nav'
import { DrawerMenu } from './drawer-menu'
import { TradeSheet } from './trade-sheet'
import { SplashScreen } from './screens/splash-screen'
import { ExploreScreen } from './screens/explore-screen'
import { MarketsScreen } from './screens/markets-screen'
import { MarketDetail } from './screens/market-detail'
import { CategoryDetailScreen } from './screens/category-detail'
import { PortfolioScreen } from './screens/portfolio-screen'

const TITLES: Record<Tab, string> = {
  explore: 'Explore',
  markets: 'Markets',
  portfolio: 'Portfolio',
}

export function AppShell() {
  const [splash, setSplash] = useState(true)
  const [tab, setTab] = useState<Tab>('explore')
  const [dark, setDark] = useState(true)
  const [drawer, setDrawer] = useState(false)
  const [detail, setDetail] = useState<Market | null>(null)
  const [categoryDetail, setCategoryDetail] = useState<string | null>(null)
  const [trade, setTrade] = useState<{ market: Market; side: 'yes' | 'no' } | null>(
    null,
  )

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2200)
    return () => clearTimeout(t)
  }, [])

  const openMarket = (m: Market) => setDetail(m)

  return (
    <div className="grid min-h-screen place-items-center bg-[#05070a] p-0 sm:p-6">
      {/* Android device frame */}
      <div className="relative h-screen w-full max-w-[420px] overflow-hidden bg-background sm:h-[860px] sm:rounded-[38px] sm:border-[10px] sm:border-[#05070a] sm:shadow-2xl">
        <div className={`relative h-full w-full ${dark ? '' : 'light'}`}>
          <div className="relative flex h-full flex-col bg-background text-foreground">
            {splash ? (
              <SplashScreen />
            ) : detail ? (
              <MarketDetail
                market={detail}
                onBack={() => setDetail(null)}
                onTrade={(side) => setTrade({ market: detail, side })}
              />
            ) : categoryDetail ? (
              <CategoryDetailScreen
                categoryValue={categoryDetail}
                onBack={() => setCategoryDetail(null)}
                onOpenMarket={openMarket}
              />
            ) : (
              <>
                <TopBar title={TITLES[tab]} onMenu={() => setDrawer(true)} />
                <main className="no-scrollbar flex-1 overflow-y-auto">
                  {tab === 'explore' && (
                    <ExploreScreen onOpenMarket={openMarket} />
                  )}
                  {tab === 'markets' && (
                    <MarketsScreen onOpenMarket={openMarket} />
                  )}
                  {tab === 'portfolio' && <PortfolioScreen />}
                </main>
                <BottomNav active={tab} onChange={setTab} />
              </>
            )}

            {/* Overlays */}
            <DrawerMenu
              open={drawer}
              onClose={() => setDrawer(false)}
              dark={dark}
              onToggleTheme={() => setDark((d) => !d)}
              onSubCategoryClick={(value) => setCategoryDetail(value)}
              onNavigatePortfolio={() => setTab('portfolio')}
            />
            {trade && (
              <TradeSheet
                market={trade.market}
                side={trade.side}
                onClose={() => setTrade(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
