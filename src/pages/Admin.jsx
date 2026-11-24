import { useEffect, useState } from 'react'
import {
  Activity,
  Coins,
  Loader2,
  PlayCircle,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { api } from '../api'
import { coins as fmtCoins, formatDate, relativeTime, usd } from '../lib/format'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'withdrawals', label: 'Withdrawals' },
]

export default function Admin() {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.adminOverview(), api.adminUsers(), api.adminWithdrawals()])
      .then(([o, u, w]) => {
        if (!active) return
        setOverview(o)
        setUsers(u)
        setWithdrawals(w)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  async function openActivity(userId) {
    setActivity({ loading: true })
    try {
      const data = await api.adminUserActivity(userId)
      setActivity(data)
    } catch (err) {
      setError(err.message)
      setActivity(null)
    }
  }

  async function changeStatus(id, status) {
    try {
      const data = await api.adminSetWithdrawalStatus(id, status)
      setWithdrawals((prev) => prev.map((w) => (w.id === id ? data.withdrawal : w)))
    } catch (err) {
      setError(err.message)
    }
  }

  async function setKyc(id, status) {
    try {
      const data = await api.adminSetKyc(id, status)
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, kycStatus: data.user.kycStatus } : u)))
    } catch (err) {
      setError(err.message)
    }
  }

  const stats = overview
    ? [
        { icon: Users, label: 'Users', value: fmtCoins(overview.users), tone: 'text-brand-600' },
        { icon: Coins, label: 'Coins in circulation', value: fmtCoins(overview.totalCoins), tone: 'text-amber-600' },
        { icon: Activity, label: 'Total earned', value: usd(overview.totalEarnedUsd), tone: 'text-emerald-600' },
        { icon: Wallet, label: 'Total withdrawn', value: usd(overview.totalWithdrawnUsd), tone: 'text-rose-600' },
        { icon: PlayCircle, label: 'Ads watched', value: fmtCoins(overview.adsWatched), tone: 'text-sky-600' },
        { icon: Receipt, label: 'Pending cashouts', value: fmtCoins(overview.pendingWithdrawals), tone: 'text-orange-600' },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4">
        <ShieldCheck className="h-5 w-5 text-brand-600" />
        <div>
          <p className="text-sm font-bold text-ink">Admin overview</p>
          <p className="text-xs text-slate-500">Monitor every account, their activity, and withdrawal requests.</p>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="card p-5">
                <Icon className={`h-5 w-5 ${tone}`} />
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-base font-bold text-ink">Account data</h3>
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                {TABS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setTab(option.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      tab === option.id ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'users' ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-semibold">User</th>
                      <th className="px-5 py-3 text-right font-semibold">Balance</th>
                      <th className="px-5 py-3 text-right font-semibold">Total earned</th>
                      <th className="px-5 py-3 text-right font-semibold">Ads</th>
                      <th className="px-5 py-3 text-right font-semibold">Cashouts</th>
                      <th className="px-5 py-3 text-center font-semibold">Fee</th>
                      <th className="px-5 py-3 text-center font-semibold">KYC</th>
                      <th className="px-5 py-3 text-right font-semibold">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-bold tabular-nums text-ink">{fmtCoins(u.coins)}</td>
                        <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-emerald-600">{fmtCoins(u.totalEarnedCoins)}</td>
                        <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-600">{fmtCoins(u.adsWatched)}</td>
                        <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-600">{fmtCoins(u.withdrawals)}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`chip ${u.verificationFeePaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {u.verificationFeePaid ? 'Paid' : 'Not paid'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <select
                            value={u.kycStatus || 'none'}
                            onChange={(e) => setKyc(u.id, e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="none">None</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => openActivity(u.id)} className="text-xs font-bold text-brand-600 hover:text-brand-700">
                            View →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-5 py-3 font-semibold">User</th>
                      <th className="px-5 py-3 font-semibold">Amount</th>
                      <th className="px-5 py-3 font-semibold">Method</th>
                      <th className="px-5 py-3 font-semibold">Account</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-5 py-3 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">{w.userName}</p>
                          <p className="text-xs text-slate-400">{w.userEmail}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-ink">{usd(w.amount)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{w.method}</td>
                        <td className="px-5 py-4 text-xs text-slate-500">{w.account}</td>
                        <td className="px-5 py-4 text-xs text-slate-500">{formatDate(w.createdAt)}</td>
                        <td className="px-5 py-4 text-right">
                          <select
                            value={w.status}
                            onChange={(e) => changeStatus(w.id, e.target.value)}
                            className={`rounded-lg border px-2 py-1.5 text-xs font-bold outline-none ${
                              w.status === 'paid'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : w.status === 'rejected'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activity && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setActivity(null)} aria-label="Close" />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-ink">{activity.user?.name} — Activity</h3>
                <p className="text-xs text-slate-500">{activity.user?.email}</p>
              </div>
              <button onClick={() => setActivity(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {activity.loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Transactions</p>
                {activity.transactions?.length ? (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {activity.transactions.map((tx) => (
                      <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{tx.description}</p>
                          <p className="text-xs text-slate-400">{relativeTime(tx.createdAt)}</p>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${tx.coins > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.coins > 0 ? '+' : '−'}{fmtCoins(Math.abs(tx.coins))} coins
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-500">No transactions.</p>}

                <p className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">Withdrawals</p>
                {activity.withdrawals?.length ? (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {activity.withdrawals.map((w) => (
                      <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{usd(w.amount)} to {w.method}</p>
                          <p className="text-xs text-slate-400">{w.account} · {formatDate(w.createdAt)}</p>
                        </div>
                        <span className="chip bg-slate-100 text-slate-600">{w.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-500">No withdrawals.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
