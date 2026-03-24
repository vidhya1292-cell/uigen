import { prisma } from '@/lib/prisma'
import type { DailyReadingContent } from '@/lib/daily-reading/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  let record = await prisma.dailyReading.findUnique({ where: { date: today } })

  if (!record) {
    // Auto-generate if missing
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
      await fetch(`${base}/api/daily-reading/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      record = await prisma.dailyReading.findUnique({ where: { date: today } })
    } catch {
      // ignore — caller handles null
    }
  }

  if (!record) {
    return Response.json({ error: 'No content available' }, { status: 404 })
  }

  const content: DailyReadingContent = JSON.parse(record.content)
  return Response.json(content)
}
