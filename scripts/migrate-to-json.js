const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const db = new Database(path.join(__dirname, '../prisma/daily-reading.db'))
const rows = db.prepare('SELECT date, content, usedLinks FROM DailyReading').all()

const store = { readings: {} }
for (const row of rows) {
  store.readings[row.date] = {
    content: JSON.parse(row.content),
    usedLinks: JSON.parse(row.usedLinks),
  }
}

const outPath = path.join(__dirname, '../data/daily-readings.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(store, null, 2))
console.log('Migrated', Object.keys(store.readings).length, 'entries:', Object.keys(store.readings))
db.close()
