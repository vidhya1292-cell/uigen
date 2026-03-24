import fs from 'node:fs'
import path from 'node:path'
import type { DailyReadingContent } from '@/lib/daily-reading/types'

const STORE_PATH = path.join(process.cwd(), 'data', 'daily-readings.json')

interface StoreEntry {
  content: DailyReadingContent
  usedLinks: string[]
}

interface Store {
  readings: Record<string, StoreEntry>
}

function read(): Store {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
  } catch {
    return { readings: {} }
  }
}

function write(store: Store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2))
}

export function getReading(date: string): StoreEntry | null {
  return read().readings[date] ?? null
}

export function saveReading(date: string, content: DailyReadingContent, usedLinks: string[]) {
  const store = read()
  store.readings[date] = { content, usedLinks }
  write(store)
}

export function getRecentUsedLinks(days = 14): string[] {
  const store = read()
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
  return Object.entries(store.readings)
    .filter(([date]) => date >= cutoff)
    .flatMap(([, entry]) => entry.usedLinks)
}
