import { useEffect, useRef, useState } from 'react'
import { Check, Clock, ExternalLink, Gift, Loader2, ShieldCheck, Sparkles, X, Zap } from 'lucide-react'
import { api } from '../api'
import { coins, usd } from '../lib/format'

const R = 44
const CIRCUMFERENCE = 2 * Math.PI * R

export default function AdModal({ ad, onClose, onClaimed }) {
  const [sessionId, setSessionId] = useState(null)
  const [remaining, setRemaining] = useState(ad.duration)
  const [error, setError] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const endsAtRef = useRef(null)
  const startedRef = useRef(false)
  const closeTimerRef = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    let cancelled = false
    api
      .startAd(ad.id)
      .then((data) => {
        if (cancelled) return
        setSessionId(data.sessionId)
        endsAtRef.current = Date.now() + data.duration * 1000
        setRemaining(data.duration)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [ad.id])

  useEffect(() => {
    if (!sessionId || !endsAtRef.current) return
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) clearInterval(timer)
    }, 200)
    return () => clearInterval(timer)
  }, [sessionId])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ready = remaining === 0 && !!sessionId && !claimed
  const progress = 1 - remaining / ad.duration

  async function claim() {
    if (!ready || claiming) return
    setClaiming(true)
    setError('')
    try {
      const result = await api.completeAd(sessionId)
      setClaimed(true)
      onClaimed(result)
      closeTimerRef.current = setTimeout(onClose, 1400)
    } catch (err) {
      setError(err.message)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <button className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-label="Close ad" />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl animate-fade-up">
        {/* Ad creative */}
        <div className={`relative overflow-hidden bg-gradient-to-br ${ad.gradient} px-6 pb-8 pt-6 text-white`}>
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-black/10 blur-2xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-sm font-extrabold backdrop-blur">
                {ad.glyph}
              </div>
              <div>
                <p className="text-sm font-extrabold leading-none">{ad.brand}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/70">{ad.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                Sponsored
              </span>
              <button
                onClick={onClose}
                className="rounded-full bg-black/20 p-1.5 backdrop-blur transition hover:bg-black/40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative mt-8">
            <h2 className="max-w-sm text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{ad.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">{ad.body}</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {ad.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
                  <Check className="h-3.5 w-3.5" /> {perk}
                </li>
              ))}
            </ul>
            <a
              href={ad.targetUrl || 'https://jforce.jumia.co.ke/affiliate'}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              {ad.cta} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="mt-2 text-[11px] text-white/70">Opens Jumia in a new tab</p>
          </div>
        </div>

        {/* Reward / countdown panel */}
        <div className="px-6 py-6 sm:px-8">
          {claimed ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-up">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-ink">Reward claimed!</p>
                <p className="mt-1 text-sm text-slate-500">
                  {coins(ad.reward)} coins · {usd(ad.reward / 100)} added to your balance.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r={R}
                    fill="none"
                    stroke={ready ? '#10b981' : '#4f46e5'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
                    className="transition-all duration-200"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold tabular-nums text-ink">{remaining}s</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">left</span>
                </div>
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Gift className="h-4 w-4 text-brand-600" />
                  <span className="text-sm font-bold text-ink">Your reward</span>
                </div>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-brand-600">
                  +{coins(ad.reward)} coins <span className="text-base font-semibold text-slate-400">≈ {usd(ad.reward / 100)}</span>
                </p>
                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 sm:justify-start">
                  {ready ? (
                    <><Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Ad complete — claim your reward.</>
                  ) : (
                    <><Clock className="h-3.5 w-3.5" /> Keep watching to unlock the reward.</>
                  )}
                </p>
              </div>

              <button
                onClick={claim}
                disabled={!ready || claiming}
                className="btn-primary w-full shrink-0 sm:w-auto"
              >
                {claiming ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Claiming…</>
                ) : ready ? (
                  <><Zap className="h-4 w-4" fill="currentColor" /> Claim reward</>
                ) : (
                  <><Clock className="h-4 w-4" /> Watch to unlock</>
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs font-medium text-rose-600">{error}</p>
          )}

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Demo advertisement · no real advertiser content
          </p>
        </div>
      </div>
    </div>
  )
}
