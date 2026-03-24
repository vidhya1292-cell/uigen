export interface NewsItem {
  headline: string
  summary: string
  sources: { label: string; url: string }[]
}

export interface DeepReadItem {
  title: string
  author: string
  publication: string
  paragraphs: string[]
  readLink: string
}

export interface CompanyItem {
  name: string
  tagline: string
  whatTheyDo: string
  fundamentalChange: string
  competitors: string
  unspokenTruth: string
  assumptions: string
  bullCase: string
  sources: { label: string; url: string }[]
}

export interface DailyReadingContent {
  date: string
  whatsHappening: {
    world: NewsItem
    india: NewsItem
    markets: NewsItem
    ai: NewsItem
  }
  deepRead: DeepReadItem
  startupOfDay: CompanyItem
  publicCompanyOfDay: CompanyItem
}
