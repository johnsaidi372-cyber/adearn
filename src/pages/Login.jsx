import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Coins, Loader2, PlayCircle, ShieldCheck, Wallet, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login({ email: form.email, password: form.password })
      else await register(form)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function demo() {
    setBusy(true)
    setError('')
    try {
      await login({ email: 'demo@adearn.com', password: 'demo1234' })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 shadow-lg">
            <Zap className="h-5 w-5" fill="currentColor" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">AdEarn</span>
        </div>

        <div className="relative max-w-md">
          <span className="chip bg-white/10 text-brand-200 ring-1 ring-white/10">
            <Coins className="h-3.5 w-3.5" /> Earn while you scroll
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Watch ads. <br />
            <span className="bg-gradient-to-r from-brand-400 to-fuchsia-400 bg-clip-text text-transparent">Get paid.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-slate-400">
            A simple way to turn your spare minutes into real rewards. Watch short sponsored videos, collect coins, and cash out whenever you are ready.
          </p>

          <div className="mt-9 space-y-4">
            {[
              { icon: PlayCircle, title: 'Watch short ads', text: '12 seconds on average. No surveys, no spam.' },
              { icon: Coins, title: 'Collect coins instantly', text: 'Rewards land in your balance the moment an ad ends.' },
              { icon: Wallet, title: 'Cash out your earnings', text: 'Withdraw to your preferred payment method.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-300">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4" /> Demo app · simulated ads and payments
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-5 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white">
              <Zap className="h-5 w-5" fill="currentColor" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-ink">AdEarn</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            {mode === 'login' ? 'Sign in to keep earning.' : 'Join and get 50 free welcome coins.'}
          </p>

          <div className="mt-7 flex rounded-xl bg-slate-100 p-1">
            {['login', 'register'].map((value) => (
              <button
                key={value}
                onClick={() => { setMode(value); setError('') }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  mode === value ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {value === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.name} onChange={update('name')} placeholder="Alex Morgan" required />
              </div>
            )}
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={update('email')}
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={update('password')}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{error}</div>
            )}

            <button className="btn-primary w-full py-3" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button onClick={demo} disabled={busy} className="btn-ghost w-full py-3">
            <CheckCircle2 className="h-4 w-4 text-brand-600" /> Try the demo account
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">
            demo@adearn.com · demo1234
          </p>
        </div>
      </div>
    </div>
  )
}
