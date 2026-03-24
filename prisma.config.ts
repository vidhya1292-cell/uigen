import path from 'node:path'
import { defineConfig } from 'prisma/config'

const dbPath = path.join(process.cwd(), 'prisma', 'daily-reading.db')

export default defineConfig({
  datasource: {
    url: `file:${dbPath}`,
  },
})
