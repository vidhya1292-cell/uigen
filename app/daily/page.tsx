import { prisma } from '@/lib/prisma'
import { fetchAllFeeds } from '@/lib/daily-reading/rss-fetcher'
import { buildGenerationPrompt } from '@/lib/daily-reading/prompt'
import { NewsCard } from '@/components/daily/NewsCard'
import { DeepRead } from '@/components/daily/DeepRead'
import { CompanySection } from '@/components/daily/CompanySection'
import { RefreshButton } from '@/components/daily/RefreshButton'
import type { DailyReadingContent } from '@/lib/daily-reading/types'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

async function getOrGenerateContent(): Promise<DailyReadingContent | null> {
  const today = new Date().toISOString().split('T')[0]
  const existing = await prisma.dailyReading.findUnique({ where: { date: today } })

  if (existing) {
    return JSON.parse(existing.content) as DailyReadingContent
  }

  // Generate fresh
  try {
    const feeds = await fetchAllFeeds()
    const prompt = buildGenerationPrompt(today, feeds)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })
    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()
    const content: DailyReadingContent = JSON.parse(jsonStr)
    await prisma.dailyReading.create({ data: { date: today, content: JSON.stringify(content) } })
    return content
  } catch {
    return null
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const NEWS_CARDS = [
  { key: 'world' as const, category: 'World', emoji: '🌍' },
  { key: 'india' as const, category: 'India', emoji: '🇮🇳' },
  { key: 'markets' as const, category: 'India Markets', emoji: '📈' },
  { key: 'ai' as const, category: 'AI', emoji: '🤖' },
]

export default async function DailyPage() {
  const content = await getOrGenerateContent()

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Daily Reading</h1>
            {content && (
              <p className="text-sm text-zinc-500 mt-0.5">{formatDate(content.date)}</p>
            )}
          </div>
          <RefreshButton />
        </div>

        {!content && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
            Content generation failed. Click Refresh to try again.
          </div>
        )}

        {content && (
          <>
            {/* What's Happening */}
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">What&apos;s Happening</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {NEWS_CARDS.map(({ key, category, emoji }) => (
                  <NewsCard
                    key={key}
                    category={category}
                    emoji={emoji}
                    item={content.whatsHappening[key]}
                  />
                ))}
              </div>
            </section>

            {/* Deep Read */}
            <section className="flex flex-col gap-3">
              <DeepRead item={content.deepRead} />
            </section>

            {/* Startup of the Day */}
            <section>
              <CompanySection label="Startup of the Day" emoji="🚀" item={content.startupOfDay} />
            </section>

            {/* Public Company of the Day */}
            <section>
              <CompanySection label="Public Company of the Day" emoji="🏦" item={content.publicCompanyOfDay} />
            </section>
          </>
        )}
      </div>
    </div>
  )
}
