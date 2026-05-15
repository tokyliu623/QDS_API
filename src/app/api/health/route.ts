import { NextResponse } from 'next/server'
import { getCacheStats } from '@/lib/file-cache'

export async function GET() {
  try {
    const cacheStats = await getCacheStats()
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      cache: cacheStats,
    })
  } catch {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }
}