import type { CompanyItem } from '@/lib/daily-reading/types'

interface CompanySectionProps {
  label: string
  emoji: string
  item: CompanyItem
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      <p className="text-sm leading-relaxed text-zinc-700">{value}</p>
    </div>
  )
}

export function CompanySection({ label, emoji, item }: CompanySectionProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-900">{item.name}</h3>
        <p className="text-sm text-zinc-500 mt-1 italic">{item.tagline}</p>
      </div>
      <Row label="What they do" value={item.whatTheyDo} />
      <Row label="What they're fundamentally changing" value={item.fundamentalChange} />
      <Row label="Competitors" value={item.competitors} />
      <Row label="The unspoken truth" value={item.unspokenTruth} />
      <Row label="Assumptions & what breaks them" value={item.assumptions} />
      <Row label="Bull case & where it breaks" value={item.bullCase} />
      {item.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {item.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
            >
              {s.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
