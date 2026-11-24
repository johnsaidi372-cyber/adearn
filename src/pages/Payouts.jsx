import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Wallet } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { coins as fmtCoins, formatDate, toUsd, usd } from '../lib/format'

export default function Payouts() {
  const { user, refresh } = useAuth()
  const [config, setConfig] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([api.payoutConfig(), api.payouts()])
      .then(([c, p]) => {
        if (!active) return
        setConfig(c)
        setPayouts(p)
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const verified = (config?.kycStatus || user?.kycStatus) === 'verified'
  const minimum = config?.minimumUsd ?? 10

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const data = await api.requestPayout({ email, amount: Number(amount) })
      setPayouts((prev) => [data.payout, ...prev])
      setSuccess(`${usd(data.payout.amount)} payout submitted to ${data.payout.email}. Status: ${data.payout.status}.`)
      setAmount('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold text-amber-900">PayPal payouts are in sandbox mode</p>
          <p className="mt-1 text-xs text-amber-800">
            This integration uses PayPal's test environment only. No real money is moved. Live payouts require completed legal, KYC and compliance sign-off.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Identity status</p>
          <p className={`mt-1 text-lg font-extrabold capitalize ${verified ? 'text-emerald-600' : 'text-amber-600'}`}>
            {config?.kycStatus || user?.kycStatus || 'none'}
          </p>
        </div>
        <div className="card p-5">
          <Wallet className="h-5 w-5 text-amber-600" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Available balance</p>
          <p className="mt-1 text-lg font-extrabold text-ink tabular-nums">{usd(toUsd(user?.coins))}</p>
        </div>
        <div className="card p-5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum payout</p>
          <p className="mt-1 text-lg font-extrabold text-ink">{usd(minimum)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <h3 className="text-base font-bold text-ink">Request a PayPal payout</h3>
          <p className="mt-1 text-xs text-slate-500">
            Rewards are held for {config?.holdHours ?? 24} hours before they become payout-eligible.
          </p>

          {!config?.configured && (
            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600">
              PayPal credentials are not configured on this server. Set PAYPAL_CLIENT_ID, PAYPAL_SECRET and PAYPAL_WEBHOOK_ID.
            </div>
          )}
          {!verified && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
              Your identity must be verified before a payout can be sent. Ask an administrator to verify your account.
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>
          )}

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label className="label">PayPal email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label">Amount (USD)</label>
              <input className="input" type="number" min={minimum} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={minimum.toFixed(2)} required />
            </div>
            {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div>}
            <button className="btn-primary w-full py-3" disabled={busy || !verified || !config?.configured}>
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Request payout'}
            </button>
          </form>
        </section>

        <section className="card p-6 lg:col-span-2">
          <h3 className="text-base font-bold text-ink">Payout history</h3>
          {payouts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No payouts yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {payouts.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-ink">{usd(p.amount)}</p>
                    <span className={`chip ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : p.status === 'failed' || p.status === 'reversed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-400">{p.email} · {formatDate(p.createdAt)}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{fmtCoins(p.coins)} coins</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
