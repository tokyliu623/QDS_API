import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { prisma, initDB } from './prisma'
import type { SheetData } from '@/types'

const CACHE_DIR = process.env.CACHE_DIR || '/app/data/cache'
const CACHE_EXPIRE_DAYS = parseInt(process.env.CACHE_EXPIRE_DAYS || '7', 10)

initDB()

export function getUrlHash(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

export function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

export async function getCache(url: string): Promise<{
  found: boolean
  data?: SheetData[]
  fileName?: string
  sheetCount?: number
  nonEmptySheetCount?: number
}> {
  const urlHash = getUrlHash(url)
  
  const record = await prisma.cacheRecord.findUnique({
    where: { urlHash },
  })

  if (!record) {
    return { found: false }
  }

  if (new Date() > record.expiresAt) {
    await deleteCacheRecord(urlHash)
    return { found: false }
  }

  if (!fs.existsSync(record.cachePath)) {
    await deleteCacheRecord(urlHash)
    return { found: false }
  }

  await prisma.cacheRecord.update({
    where: { urlHash },
    data: { accessedAt: new Date() },
  })

  const content = fs.readFileSync(record.cachePath)
  const cached = JSON.parse(content.toString('utf-8'))

  return {
    found: true,
    data: cached.data,
    fileName: cached.fileName,
    sheetCount: cached.sheetCount,
    nonEmptySheetCount: cached.nonEmptySheetCount,
  }
}

export async function setCache(
  url: string,
  fileName: string,
  data: SheetData[]
): Promise<void> {
  ensureCacheDir()
  
  const urlHash = getUrlHash(url)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRE_DAYS)

  const cacheFileName = `${urlHash}.json`
  const cachePath = path.join(CACHE_DIR, cacheFileName)

  const cacheData = {
    fileName,
    data,
    sheetCount: data.length,
    nonEmptySheetCount: data.length,
  }

  fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2))

  await prisma.cacheRecord.upsert({
    where: { urlHash },
    update: {
      fileName,
      fileSize: Buffer.byteLength(JSON.stringify(cacheData)),
      cachePath,
      expiresAt,
      accessedAt: new Date(),
    },
    create: {
      url,
      urlHash,
      fileName,
      fileSize: Buffer.byteLength(JSON.stringify(cacheData)),
      cachePath,
      expiresAt,
    },
  })
}

async function deleteCacheRecord(urlHash: string): Promise<void> {
  try {
    const record = await prisma.cacheRecord.findUnique({
      where: { urlHash },
    })
    
    if (record && fs.existsSync(record.cachePath)) {
      fs.unlinkSync(record.cachePath)
    }
    
    await prisma.cacheRecord.delete({
      where: { urlHash },
    })
  } catch {
    // Ignore errors during cleanup
  }
}

export async function cleanupExpiredCache(): Promise<{
  deleted: number
  errors: number
}> {
  let deleted = 0
  let errors = 0

  try {
    const expiredRecords = await prisma.cacheRecord.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    for (const record of expiredRecords) {
      try {
        if (fs.existsSync(record.cachePath)) {
          fs.unlinkSync(record.cachePath)
        }
        
        await prisma.cacheRecord.delete({
          where: { id: record.id },
        })
        
        deleted++
      } catch {
        errors++
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error)
    errors++
  }

  return { deleted, errors }
}

export async function getCacheStats(): Promise<{
  total: number
  expired: number
  totalSize: number
}> {
  const records = await prisma.cacheRecord.findMany()
  const now = new Date()
  
  let expired = 0
  let totalSize = 0

  for (const record of records) {
    if (record.expiresAt < now) {
      expired++
    }
    totalSize += record.fileSize
  }

  return {
    total: records.length,
    expired,
    totalSize,
  }
}