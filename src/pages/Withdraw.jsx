import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Info,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { coins as fmtCoins, toUsd, usd } from '../lib/format'

const MIN = 5
const VERIFICATION_FEE = 3
const METHODS = [
  { id: 'PayPal', label: 'PayPal', hint: 'you@example.com' },
  { id: 'Bank Transfer', label: 'Bank transfer', hint: 'Account number' },
  { id: 'Gift Card', label: 'Gift card', hint: 'Redemption code' },
]

export default function Withdraw() {
  const { user, refresh } = useAuth()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('PayPal')
  const [account, setAccount] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState('')
  const [withdrawals, setWithdrawals] = useState([])

  const balance = user?.coins ?? 0
  const balanceUsd = toUsd(balance)

  useEffect(() => {
    let active = true
    api.withdrawals().then((data) => active && setWithdrawals(data)).catch(() => {})
    return () => { active = false }
  }, [])

  const selectedMethod = METHODS.find((m) => m.id === method)
  const amountNum = Number(amount)
  const neededCoins = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) : 0
  const feeApplies = !user?.verificationFeePaid
  const feeCoins = feeApplies ? VERIFICATION_FEE * 100 : 0
  const totalCoins = neededCoins + feeCoins

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!Number.isFinite(amountNum) || amountNum < MIN) {
      setError(`The minimum withdrawal is ${usd(MIN)}.`)
      return
    }
    if (totalCoins > balance) {
      setError(
        feeApplies
          ? `You need ${fmtCoins(totalCoins)} coins: ${fmtCoins(neededCoins)} for this withdrawal plus the one-time ${usd(VERIFICATION_FEE)} verification fee.`
          : 'You do not have enough coins for this withdrawal.'
      )
      return
    }
    setBusy(true)
    try {
      const data = await api.requestWithdrawal({ amount: amountNum, method, account })
      setWithdrawals((prev) => [data.withdrawal, ...prev])
      setSuccess(
        data.feeCharged
          ? `${usd(amountNum)} withdrawal requested. A one-time ${usd(data.feeCharged)} verification fee was deducted from your balance.`
          : `${usd(amountNum)} withdrawal requested. We will process it shortly.`
      )
      setAmount('')
      setAccount('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Withdrawal form */}
        <section className="card p-6 lg:col-span-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink">Request a withdrawal</h3>
              <p className="mt-0.5 text-xs text-slate-500">Minimum {usd(MIN)} · 100 coins = {usd(1)}</p>
            </div>
          </div>

          {feeApplies ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-extrabold">** IMPORTANT — ONE-TIME VERIFICATION FEE: {usd(VERIFICATION_FEE)} **</p>
              <p className="mt-1.5 font-bold">
                This {usd(VERIFICATION_FEE)} fee is charged ONCE IN A LIFETIME on your first withdrawal only. NO MORE AMOUNT WILL EVER BE REQUESTED FOR FACILITATION.
              </p>
              <p className="mt-1.5 text-xs text-amber-800">
                It is deducted from your own coin balance — you never pay out-of-pocket or send money to anyone.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <p className="font-extrabold">Verification fee already paid — no further fees will ever be charged.</p>
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {success}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div>
              <label className="label">Amount to withdraw</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">$</span>
                <input
                  type="number"
                  min={MIN}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="10.00"
                  className="input py-3 pl-9 pr-24 text-lg font-bold tabular-nums"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.max(0, (balance - feeCoins) / 100)))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100"
                >
                  MAX
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[5, 10, 20, 50].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      amount === String(value)
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {usd(value)}
                  </button>
                ))}
                <span className="ml-auto text-xs font-semibold text-slate-500">
                  {neededCoins
                    ? feeApplies
                      ? `${fmtCoins(totalCoins)} coins total (${fmtCoins(neededCoins)} + ${fmtCoins(feeCoins)} one-time fee)`
                      : `${fmtCoins(neededCoins)} coins needed`
                    : 'Enter an amount'}
                </span>
              </div>
            </div>

            <div>
              <label className="label">Payment method</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {METHODS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMethod(option.id)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                      method === option.id
                        ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">{selectedMethod.hint}</label>
              <input
                className="input"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={selectedMethod.hint}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div>
            )}

            <button className="btn-primary w-full py-3" disabled={busy || balance < MIN * 100 + feeCoins}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</> : <>Request {amountNum >= MIN ? usd(amountNum) : 'withdrawal'} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>
        </section>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="bg-gradient-to-br from-ink to-slate-800 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Available balance</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight tabular-nums">{usd(balanceUsd)}</p>
              <p className="mt-1 text-xs text-slate-400">{fmtCoins(balance)} coins available</p>
            </div>
            <div className="space-y-3 p-5">
              {[
                { icon: ShieldCheck, text: 'Secure payout processing' },
                { icon: Clock3, text: 'Usually paid within 1–2 business days' },
                { icon: Info, text: 'Demo app — no real money is transferred' },
              ].map(({ icon: Icon, text }) => (
                <p key={text} className="flex items-start gap-2.5 text-xs text-slate-600">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {text}
                </p>
              ))}
              {balance < MIN * 100 && (
                <Link to="/watch" className="btn-primary mt-2 w-full">
                  <PlayCircle className="h-4 w-4" /> Earn more coins
                </Link>
              )}
            </div>
          </section>

          <section className="card p-5">
            <h3 className="text-base font-bold text-ink">Recent requests</h3>
            {withdrawals.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No withdrawal requests yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {withdrawals.slice(0, 5).map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{usd(w.amount)}</p>
                      <p className="truncate text-xs text-slate-400">{w.method} · {new Date(w.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`chip shrink-0 ${w.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {w.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
