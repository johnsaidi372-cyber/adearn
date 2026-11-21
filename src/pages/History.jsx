import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Coins, Loader2, SlidersHorizontal } from 'lucide-react'
import { api } from '../api'
import { formatDate, relativeTime, usd } from '../lib/format'

const FILTERS = [
  { id: 'all', label: 'All activity' },
  { id: 'earn', label: 'Earnings' },
  { id: 'withdraw', label: 'Withdrawals' },
]

export default function History() {
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .transactions()
      .then((data) => active && setTransactions(data))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const visible = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  )

  const totals = useMemo(
    () => ({
      earned: transactions.filter((t) => t.type === 'earn').reduce((s, t) => s + t.usd, 0),
      withdrawn: transactions.filter((t) => t.type === 'withdraw').reduce((s, t) => s + Math.abs(t.usd), 0),
    }),
    [transactions]
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total transactions</p>
          <p className="mt-2 text-2xl font-extrabold text-ink">{transactions.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total earned</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{usd(totals.earned)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total withdrawn</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">{usd(totals.withdrawn)}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-ink">All transactions</h3>
            <p className="mt-0.5 text-xs text-slate-500">A complete log of your earnings and cashouts.</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <SlidersHorizontal className="ml-2 h-3.5 w-3.5 text-slate-400" />
            {FILTERS.map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filter === option.id ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Coins className="h-9 w-9 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Nothing here yet</p>
            <p className="text-xs text-slate-400">Watch an ad to start earning coins.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-semibold">Activity</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Coins</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((tx) => {
                  const earn = tx.type === 'earn'
                  const Icon = earn ? ArrowDownLeft : ArrowUpRight
                  return (
                    <tr key={tx.id} className="transition hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${earn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{tx.description}</p>
                            <p className="text-xs capitalize text-slate-400">
                              {earn ? 'Reward' : tx.type === 'fee' ? 'One-time verification fee' : 'Cashout'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-600">{formatDate(tx.createdAt)}</p>
                        <p className="text-xs text-slate-400">{relativeTime(tx.createdAt)}</p>
                      </td>
                      <td className={`px-5 py-4 text-right text-sm font-bold tabular-nums ${earn ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {earn ? '+' : '−'}{Math.abs(tx.coins).toLocaleString()}
                      </td>
                      <td className={`px-5 py-4 text-right text-sm font-bold tabular-nums ${earn ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {earn ? '+' : '−'}{usd(Math.abs(tx.usd))}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="chip bg-emerald-50 text-emerald-700">Completed</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
