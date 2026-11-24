import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  Coins,
  History,
  Home,
  LogOut,
  Menu,
  PlayCircle,
  Search,
  Send,
  ShieldCheck,
  User as UserIcon,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/watch', label: 'Watch ads', icon: PlayCircle },
  { to: '/history', label: 'History', icon: History },
  { to: '/withdraw', label: 'Withdraw', icon: Wallet },
  { to: '/payouts', label: 'PayPal payouts', icon: Send },
  { to: '/profile', label: 'Profile', icon: UserIcon },
]

const PAGE_META = {
  '/': { title: 'Dashboard', subtitle: 'Here is what is happening with your account.' },
  '/watch': { title: 'Watch ads', subtitle: 'Pick an ad, watch it, and collect your reward.' },
  '/history': { title: 'Transaction history', subtitle: 'Every coin earned and every cashout.' },
  '/withdraw': { title: 'Withdraw', subtitle: 'Turn your coins into real money.' },
  '/payouts': { title: 'PayPal payouts', subtitle: 'Sandbox payouts for verified accounts.' },
  '/profile': { title: 'Profile', subtitle: 'Your account details and settings.' },
  '/admin': { title: 'Admin', subtitle: 'Monitor all accounts and withdrawal requests.' },
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const navItems =
    user?.role === 'admin' ? [...NAV, { to: '/admin', label: 'Admin', icon: ShieldCheck }] : NAV

  return (
    <div className="flex h-full flex-col bg-ink text-slate-300">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-lg shadow-brand-900/30">
          <Zap className="h-5 w-5" fill="currentColor" />
        </div>
        <div>
          <p className="text-base font-extrabold leading-none tracking-tight text-white">AdEarn</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">watch · earn · repeat</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-600/30 to-fuchsia-600/10 p-4">
        <p className="text-xs font-semibold text-white">Earn faster</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Watch more ads daily to reach your first cashout sooner.
        </p>
        <NavLink
          to="/watch"
          onClick={onNavigate}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-300 hover:text-white"
        >
          Start watching <span aria-hidden>→</span>
        </NavLink>
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-xs font-bold text-white">
            {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const meta = PAGE_META[location.pathname] || { title: 'AdEarn', subtitle: '' }

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative h-full w-72 max-w-[85vw] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="mx-auto flex h-[70px] max-w-7xl items-center gap-4 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">{meta.title}</h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">{meta.subtitle}</p>
            </div>

            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                placeholder="Search ads…"
                className="w-32 bg-transparent text-sm outline-none placeholder:text-slate-400 lg:w-44"
              />
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">⌘K</kbd>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700 ring-1 ring-amber-200">
              <Coins className="h-4 w-4" />
              <span className="text-sm font-bold tabular-nums">{(user?.coins ?? 0).toLocaleString()}</span>
              <span className="hidden text-xs font-medium sm:inline">coins</span>
            </div>

            <button className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-[11px] font-bold text-white">
                {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
