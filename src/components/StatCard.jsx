export default function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return (
    <div className="card animate-fade-up p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {sub && <span className="text-right text-[11px] font-medium text-slate-400">{sub}</span>}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-ink tabular-nums">{value}</p>
    </div>
  )
}
