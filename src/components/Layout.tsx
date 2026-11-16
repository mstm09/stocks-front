import { NavLink, Outlet } from 'react-router'

/** 画面の上に出すメニュー。画面を増やしたら、ここにも足す。 */
const NAV_ITEMS = [
  { to: '/', label: 'ホーム' },
  { to: '/candidates', label: '売り建て候補' },
]

/** 全画面で共通の枠（上のメニュー）。<Outlet /> の位置に、URLに合った画面が入る。 */
export function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-6 px-4">
          <span className="font-semibold tracking-tight">stocks-front</span>
          <nav className="flex gap-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
