import type { DailyReadingContent } from './types'

export async function syncToNotion(content: DailyReadingContent): Promise<void> {
  const token = process.env.NOTION_API_KEY
  if (!token) return

  const DATABASE_ID = 'c7e00ea7e0bc4a8c805e1b17a00ff405'

  const headers = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }

  const fmt = (item: { headline: string; summary: string }) =>
    `${item.headline}\n\n${item.summary}`

  // Check if entry for this date already exists
  const searchRes = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      filter: { property: 'Date', title: { equals: content.date } },
    }),
  })
  const searchData = await searchRes.json()
  const existingId = searchData.results?.[0]?.id

  const properties = {
    Date: { title: [{ text: { content: content.date } }] },
    World: { rich_text: [{ text: { content: fmt(content.whatsHappening.world) } }] },
    India: { rich_text: [{ text: { content: fmt(content.whatsHappening.india) } }] },
    Markets: { rich_text: [{ text: { content: fmt(content.whatsHappening.markets) } }] },
    AI: { rich_text: [{ text: { content: fmt(content.whatsHappening.ai) } }] },
    'Deep Read': {
      rich_text: [{ text: { content: `${content.deepRead.title} — ${content.deepRead.author} (${content.deepRead.publication})\n\n${content.deepRead.paragraphs.join('\n\n')}` } }],
    },
    'Startup of Day': {
      rich_text: [{ text: { content: `${content.startupOfDay.name}: ${content.startupOfDay.whatTheyDo}` } }],
    },
    'Public Company of Day': {
      rich_text: [{ text: { content: `${content.publicCompanyOfDay.name}: ${content.publicCompanyOfDay.whatTheyDo}` } }],
    },
  }

  if (existingId) {
    await fetch(`https://api.notion.com/v1/pages/${existingId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ properties }),
    })
  } else {
    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties }),
    })
  }
}
