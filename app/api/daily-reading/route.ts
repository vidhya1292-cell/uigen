import { getReading } from '@/lib/store'
import type { DailyReadingContent } from '@/lib/daily-reading/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  let entry = getReading(today)

  if (!entry) {
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
      await fetch(`${base}/api/daily-reading/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      entry = getReading(today)
    } catch {
      // ignore
    }
  }

  if (!entry) {
    return Response.json({ error: 'No content available' }, { status: 404 })
  }

  const content: DailyReadingContent = entry.content
  return Response.json(content)
}
