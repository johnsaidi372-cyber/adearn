import { ArrowDownLeft, ArrowUpRight, Coins } from 'lucide-react'
import { relativeTime, usd } from '../lib/format'

export default function TransactionList({ transactions = [], limit, emptyLabel = 'No activity yet.' }) {
  const items = limit ? transactions.slice(0, limit) : transactions

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <Coins className="h-8 w-8 text-slate-300" />
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((tx) => {
        const earn = tx.type === 'earn'
        const Icon = earn ? ArrowDownLeft : ArrowUpRight
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3.5">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                earn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{tx.description}</p>
              <p className="mt-0.5 text-xs text-slate-400">{relativeTime(tx.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold tabular-nums ${earn ? 'text-emerald-600' : 'text-rose-600'}`}>
                {earn ? '+' : '−'}{usd(Math.abs(tx.usd))}
              </p>
              <p className="mt-0.5 text-xs text-slate-400 tabular-nums">
                {earn ? '+' : '−'}{Math.abs(tx.coins)} coins
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
