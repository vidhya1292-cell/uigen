import type { NewsItem } from '@/lib/daily-reading/types'

interface NewsCardProps {
  category: string
  emoji: string
  item: NewsItem
}

export function NewsCard({ category, emoji, item }: NewsCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{category}</span>
      </div>
      <h3 className="text-base font-semibold leading-snug text-zinc-900">{item.headline}</h3>
      <p className="text-sm leading-relaxed text-zinc-600">{item.summary}</p>
      {item.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-auto pt-2">
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
