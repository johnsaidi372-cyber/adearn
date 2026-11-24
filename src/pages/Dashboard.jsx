import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Coins,
  Gift,
  Loader2,
  PlayCircle,
  Plus,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import StatCard from '../components/StatCard'
import TransactionList from '../components/TransactionList'
import { coins as fmtCoins, toUsd, usd } from '../lib/format'

const MIN_CASHOUT = 1000

export default function Dashboard() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([api.transactions(), api.listAds()])
      .then(([txs, listedAds]) => {
        if (!active) return
        setTransactions(txs)
        setAds(listedAds)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const balance = user?.coins ?? 0
  const progress = Math.min(100, (balance / MIN_CASHOUT) * 100)
  const balanceUsd = toUsd(balance)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-brand-900/15 sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="chip bg-white/15 text-white ring-1 ring-white/15">
              <Sparkles className="h-3.5 w-3.5" /> Your earning dashboard
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hey {user?.name?.split(' ')[0]} 👋
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/75">
              You have <strong className="text-white">{fmtCoins(balance)} coins</strong> ({usd(balanceUsd)}) ready.
              Watch a few more ads to grow your balance.
            </p>
          </div>
          <Link to="/watch" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-700 shadow-lg transition hover:bg-brand-50">
            <PlayCircle className="h-4 w-4" /> Watch ads <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Available balance" value={usd(balanceUsd)} sub="100 coins = $1" tone="brand" />
        <StatCard icon={Coins} label="Coin balance" value={fmtCoins(balance)} sub="ready to spend" tone="amber" />
        <StatCard icon={TrendingUp} label="Total earned" value={usd(toUsd(user?.totalEarnedCoins))} sub="all time" tone="emerald" />
        <StatCard icon={PlayCircle} label="Ads watched" value={fmtCoins(user?.adsWatched)} sub="completed" tone="sky" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Available ads */}
        <section className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-ink">Available ads</h3>
              <p className="mt-0.5 text-xs text-slate-500">Short ads, instant rewards.</p>
            </div>
            <Link to="/watch" className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ads.slice(0, 4).map((ad) => (
                <Link
                  key={ad.id}
                  to="/watch"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ad.gradient} text-sm font-extrabold text-white shadow-sm`}>
                    {ad.glyph}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{ad.brand}</p>
                    <p className="truncate text-xs text-slate-500">{ad.category} · {ad.duration}s</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-600">+{ad.reward}</p>
                    <p className="text-[10px] font-medium text-slate-400">coins</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Next cashout</h3>
              <Gift className="h-5 w-5 text-brand-600" />
            </div>
            <p className="mt-1 text-xs text-slate-500">Reach {fmtCoins(MIN_CASHOUT)} coins to withdraw.</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold">
              <span className="text-slate-500">{fmtCoins(balance)} / {fmtCoins(MIN_CASHOUT)} coins</span>
              <span className="text-brand-600">{Math.round(progress)}%</span>
            </div>
            <Link
              to="/withdraw"
              className="btn-ghost mt-4 w-full"
            >
              <Wallet className="h-4 w-4" /> Go to withdrawals
            </Link>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Recent activity</h3>
              <Link to="/history" className="text-xs font-bold text-brand-600 hover:text-brand-700">See all</Link>
            </div>
            <div className="mt-1">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
              ) : (
                <TransactionList transactions={transactions} limit={4} />
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 pb-2 text-center text-xs text-slate-400">
        <Plus className="h-3 w-3" /> Tip: longer ads pay more coins.
      </div>
    </div>
  )
}
