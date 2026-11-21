import { useNavigate } from 'react-router-dom'
import { CalendarDays, Coins, LogOut, Mail, ShieldCheck, TrendingUp, User as UserIcon, Wallet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { coins as fmtCoins, formatDate, toUsd, usd } from '../lib/format'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const rows = [
    { icon: UserIcon, label: 'Full name', value: user?.name },
    { icon: Mail, label: 'Email address', value: user?.email },
    { icon: CalendarDays, label: 'Member since', value: formatDate(user?.createdAt) },
    { icon: Coins, label: 'Coin balance', value: `${fmtCoins(user?.coins)} coins` },
  ]

  const stats = [
    { icon: TrendingUp, label: 'Total earned', value: usd(toUsd(user?.totalEarnedCoins)), tone: 'text-emerald-600' },
    { icon: Wallet, label: 'Withdrawals', value: String(user?.withdrawals ?? 0), tone: 'text-brand-600' },
    { icon: Coins, label: 'Ads watched', value: fmtCoins(user?.adsWatched), tone: 'text-amber-600' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-700 via-brand-600 to-fuchsia-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end justify-between gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-amber-400 to-rose-500 text-2xl font-extrabold text-white shadow-lg">
              {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="chip mb-1 bg-emerald-50 text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Verified account</span>
          </div>
          <h2 className="mt-4 text-xl font-extrabold text-ink">{user?.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{user?.email}</p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="card p-5">
            <Icon className={`h-5 w-5 ${tone}`} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-ink tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <section className="card p-6">
        <h3 className="text-base font-bold text-ink">Account details</h3>
        <dl className="mt-4 divide-y divide-slate-100">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-3.5">
              <Icon className="h-4 w-4 shrink-0 text-slate-400" />
              <dt className="text-sm text-slate-500">{label}</dt>
              <dd className="ml-auto text-sm font-semibold text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-ink">Sign out</h3>
          <p className="mt-0.5 text-xs text-slate-500">You can sign back in at any time.</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="btn-ghost shrink-0 text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>

      <p className="text-center text-xs text-slate-400">AdEarn demo · simulated ads, coins and payments</p>
    </div>
  )
}
