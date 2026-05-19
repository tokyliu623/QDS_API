import { prisma } from '../src/lib/prisma'
import * as fs from 'fs'

const CACHE_DIR = process.env.CACHE_DIR || '/app/data/cache'

async function cleanupExpiredCache(): Promise<void> {
  console.log('[cleanup] Starting cache cleanup...')
  console.log('[cleanup] Time:', new Date().toISOString())

  try {
    const expiredRecords = await prisma.cacheRecord.findMany({
      where: {
        expiresAt: {
          lt: new Date().toISOString(),
        },
      },
    })

    console.log(`[cleanup] Found ${expiredRecords.length} expired records`)

    let deleted = 0
    let errors = 0

    for (const record of expiredRecords) {
      try {
        if (fs.existsSync(record.cachePath)) {
          fs.unlinkSync(record.cachePath)
          console.log(`[cleanup] Deleted file: ${record.cachePath}`)
        }
        
        await prisma.cacheRecord.delete({
          where: { urlHash: record.urlHash },
        })
        
        deleted++
      } catch (error) {
        console.error(`[cleanup] Error deleting record ${record.urlHash}:`, error)
        errors++
      }
    }

    console.log(`[cleanup] Completed: deleted=${deleted}, errors=${errors}`)
  } catch (error) {
    console.error('[cleanup] Fatal error:', error)
    process.exit(1)
  }

  await prisma.$disconnect()
  console.log('[cleanup] Done')
}

cleanupExpiredCache()