import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, Coins, Loader2, PlayCircle, Sparkles } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import AdModal from '../components/AdModal'
import { coins as fmtCoins, usd } from '../lib/format'

export default function WatchAds() {
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeAd, setActiveAd] = useState(null)
  const [toast, setToast] = useState('')
  const { refresh } = useAuth()

  useEffect(() => {
    let active = true
    api
      .listAds()
      .then((data) => active && setAds(data))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  async function onClaimed(result) {
    try {
      await refresh()
      setToast(`Nice! +${fmtCoins(result.awarded)} coins added to your balance.`)
      setTimeout(() => setToast(''), 4000)
    } catch {
      // Balance will refresh on next navigation.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-fuchsia-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Earn as you watch</p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">
              Choose an ad below and watch it until the timer ends. Rewards are added to your balance instantly — 100 coins equals {usd(1)}.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-500">Total available</span>
          <span className="text-lg font-extrabold text-ink">{ads.reduce((s, a) => s + a.reward, 0)}</span>
        </div>
      </div>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /></div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {ads.map((ad, index) => (
            <button
              key={ad.id}
              onClick={() => setActiveAd(ad)}
              style={{ animationDelay: `${index * 50}ms` }}
              className="card group animate-fade-up overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${ad.gradient} p-5 text-white`}>
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl transition group-hover:scale-125" />
                <div className="absolute -bottom-14 -left-6 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
                <div className="relative flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-base font-extrabold backdrop-blur">
                    {ad.glyph}
                  </div>
                  <span className="rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                    Sponsored
                  </span>
                </div>
                <div className="relative mt-5">
                  <p className="text-sm font-extrabold">{ad.brand}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-snug text-white/75">{ad.title}</p>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip bg-slate-100 text-slate-600">{ad.category}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> {ad.duration}s
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reward</p>
                    <p className="mt-0.5 text-lg font-extrabold text-emerald-600">
                      +{ad.reward} <span className="text-xs font-semibold text-slate-400">coins</span>
                    </p>
                    <p className="text-[11px] text-slate-400">≈ {usd(ad.usd)}</p>
                  </div>
                  <span className="btn-primary pointer-events-none">
                    <PlayCircle className="h-4 w-4" /> Watch
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-slate-400">
        Ads are simulated for this demo. No real advertiser content or payments are involved.
      </p>

      {activeAd && (
        <AdModal ad={activeAd} onClose={() => setActiveAd(null)} onClaimed={onClaimed} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-2xl animate-fade-up">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  )
}
