import type { DeepReadItem } from '@/lib/daily-reading/types'

export function DeepRead({ item }: { item: DeepReadItem }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">📖</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Deep Read</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 leading-snug">{item.title}</h3>
        <p className="text-sm text-zinc-500 mt-1">
          {item.author} · {item.publication}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {item.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-zinc-700">{p}</p>
        ))}
      </div>
      <a
        href={item.readLink}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm font-medium text-zinc-900 hover:text-zinc-600 underline underline-offset-2 mt-2"
      >
        Read full article ↗
      </a>
    </div>
  )
}
