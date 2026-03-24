import { Client } from '@notionhq/client'
import type { DailyReadingContent } from './types'

const DATABASE_ID = 'c7e00ea7e0bc4a8c805e1b17a00ff405'

function getClient() {
  const token = process.env.NOTION_API_KEY
  if (!token) throw new Error('NOTION_API_KEY not set')
  return new Client({ auth: token })
}

function fmt(item: { headline: string; summary: string }) {
  return `${item.headline}\n\n${item.summary}`
}

export async function syncToNotion(content: DailyReadingContent): Promise<void> {
  const notion = getClient()

  // Check if entry for this date already exists
  const existing = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: { property: 'Date', title: { equals: content.date } },
  })

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

  if (existing.results.length > 0) {
    await notion.pages.update({ page_id: existing.results[0].id, properties })
  } else {
    await notion.pages.create({ parent: { database_id: DATABASE_ID }, properties })
  }
}
