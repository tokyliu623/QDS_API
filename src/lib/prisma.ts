import * as fs from 'fs'
import * as path from 'path'

const DB_FILE = process.env.DB_FILE || '/app/data/cache.db'

interface CacheRecord {
  id: string
  url: string
  urlHash: string
  fileName: string
  fileSize: number
  cachePath: string
  createdAt: string
  expiresAt: string
  accessedAt: string
}

interface CacheDB {
  records: CacheRecord[]
}

function readDB(): CacheDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Return empty DB on error
  }
  return { records: [] }
}

function writeDB(db: CacheDB): void {
  const dir = path.dirname(DB_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

export const prisma = {
  cacheRecord: {
    findUnique: async ({ where }: { where: { urlHash: string } }) => {
      const db = readDB()
      return db.records.find(r => r.urlHash === where.urlHash) || null
    },
    findMany: async () => {
      const db = readDB()
      return db.records
    },
    upsert: async ({ where, update, create }: { where: { urlHash: string }, update: Partial<CacheRecord>, create: CacheRecord }) => {
      const db = readDB()
      const index = db.records.findIndex(r => r.urlHash === where.urlHash)
      if (index >= 0) {
        db.records[index] = { ...db.records[index], ...update }
      } else {
        db.records.push(create)
      }
      writeDB(db)
      return db.records[index >= 0 ? index : db.records.length - 1]
    },
    update: async ({ where, data }: { where: { urlHash: string }, data: Partial<CacheRecord> }) => {
      const db = readDB()
      const index = db.records.findIndex(r => r.urlHash === where.urlHash)
      if (index >= 0) {
        db.records[index] = { ...db.records[index], ...data }
        writeDB(db)
        return db.records[index]
      }
      return null
    },
    delete: async ({ where }: { where: { urlHash: string } }) => {
      const db = readDB()
      db.records = db.records.filter(r => r.urlHash !== where.urlHash)
      writeDB(db)
    },
  },
}

export function initDB(): void {
  const dir = path.dirname(DB_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(DB_FILE)) {
    writeDB({ records: [] })
  }
}