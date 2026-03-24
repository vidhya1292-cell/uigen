import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { fetchAllFeeds } from '@/lib/daily-reading/rss-fetcher'
import { buildGenerationPrompt } from '@/lib/daily-reading/prompt'
import { syncToNotion } from '@/lib/daily-reading/notion-sync'
import type { DailyReadingContent } from '@/lib/daily-reading/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const force = body?.force === true

  const today = new Date().toISOString().split('T')[0]

  if (!force) {
    const existing = await prisma.dailyReading.findUnique({ where: { date: today } })
    if (existing) {
      return Response.json({ status: 'already_exists', date: today })
    }
  }

  // Collect URLs used in the last 14 days to avoid repeating stories
  const past = await prisma.dailyReading.findMany({
    where: { date: { gte: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0] } },
    select: { usedLinks: true },
  })
  const excludeLinks = past.flatMap((r) => JSON.parse(r.usedLinks) as string[])

  const feeds = await fetchAllFeeds()
  const prompt = buildGenerationPrompt(today, feeds, excludeLinks)

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

  // Extract JSON — handle case where Claude wraps in markdown fences
  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ?? null
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()

  let content: DailyReadingContent
  try {
    content = JSON.parse(jsonStr)
  } catch {
    return Response.json({ error: 'Failed to parse Claude response', raw: rawText.slice(0, 500) }, { status: 500 })
  }

  // Extract all URLs from generated content for deduplication in future runs
  const usedLinks = [
    ...content.whatsHappening.world.sources.map((s) => s.url),
    ...content.whatsHappening.india.sources.map((s) => s.url),
    ...content.whatsHappening.markets.sources.map((s) => s.url),
    ...content.whatsHappening.ai.sources.map((s) => s.url),
    content.deepRead.readLink,
    ...content.startupOfDay.sources.map((s) => s.url),
    ...content.publicCompanyOfDay.sources.map((s) => s.url),
  ].filter(Boolean)

  await prisma.dailyReading.upsert({
    where: { date: today },
    update: { content: JSON.stringify(content), usedLinks: JSON.stringify(usedLinks) },
    create: { date: today, content: JSON.stringify(content), usedLinks: JSON.stringify(usedLinks) },
  })

  // Sync to Notion archive (non-blocking — don't fail generation if Notion is down)
  syncToNotion(content).catch((e) => console.warn('Notion sync failed:', e.message))

  return Response.json({ status: 'generated', date: today })
}
