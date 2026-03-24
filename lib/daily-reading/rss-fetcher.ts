export const RSS_FEEDS: Record<string, string[]> = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://foreignpolicy.com/feed/',
  ],
  india: [
    'https://economictimes.indiatimes.com/news/economy/rss.cms',
    'https://economictimes.indiatimes.com/news/india/rss.cms',
    'https://www.thehindu.com/business/Economy/feeder/default.rss',
    'https://www.livemint.com/rss/economy',
  ],
  markets: [
    'https://www.thehindubusinessline.com/markets/feeder/default.rss',
    'https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss',
    'https://economictimes.indiatimes.com/news/economy/policy/rss.cms',
  ],
  ai: [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
    'https://www.technologyreview.com/feed/',
  ],
  deepRead: [
    'https://www.ben-evans.com/benedictevans/rss.xml',
    'https://www.thegeneralist.co/feed',
    'https://every.to/chain-of-thought/feed',
    'https://www.lennysnewsletter.com/feed',
    'https://hnrss.org/best',
  ],
  companyNews: [
    'https://techcrunch.com/feed/',
    'https://techcrunch.com/category/startups/feed/',
    'https://inc42.com/feed/',
    'https://economictimes.indiatimes.com/industry/rss.cms',
  ],
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyReading/1.0)' },
    })
    if (!res.ok) return ''
    return await res.text()
  } catch {
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

function extractItems(xml: string, maxItems = 5): string {
  const items: string[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1]
    const title = (/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title[^>]*>([\s\S]*?)<\/title>/i.exec(block) ?? [])[1] ?? (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block) ?? [])[1] ?? ''
    const link = (/<link>([\s\S]*?)<\/link>/i.exec(block) ?? [])[1] ?? ''
    const desc = (/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description[^>]*>([\s\S]*?)<\/description>/i.exec(block) ?? [])[1] ?? ''
    const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block) ?? [])[1] ?? ''
    const clean = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
    if (clean(title)) {
      items.push(`Title: ${clean(title)}\nLink: ${clean(link)}\nDate: ${clean(pubDate)}\nSummary: ${clean(desc).slice(0, 300)}`)
    }
  }
  return items.join('\n---\n')
}

export async function fetchAllFeeds(): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  await Promise.all(
    Object.entries(RSS_FEEDS).map(async ([category, urls]) => {
      const feedTexts = await Promise.all(urls.map(fetchFeed))
      const combined = feedTexts
        .map((xml, i) => {
          if (!xml) return ''
          const items = extractItems(xml)
          return items ? `[Source: ${urls[i]}]\n${items}` : ''
        })
        .filter(Boolean)
        .join('\n\n')
      results[category] = combined || 'No data available'
    })
  )
  return results
}
