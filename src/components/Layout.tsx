import { NavLink, Outlet } from 'react-router'
import { StockSearch } from '@/features/stocks/StockSearch'
import { cn } from '@/lib/utils'

/** 画面の上に出すメニュー。画面を増やしたら、ここにも足す。 */
const NAV_ITEMS = [
  { to: '/', label: 'ホーム' },
  { to: '/candidates', label: '売り建て候補' },
  { to: '/market', label: '市場' },
]

/** 全画面で共通の枠（上のメニュー）。<Outlet /> の位置に、URLに合った画面が入る。 */
export function Layout() {
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-6 px-4">
          <span className="font-semibold tracking-tight">stocks-front</span>
          <nav className="flex gap-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto">
            <StockSearch />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
