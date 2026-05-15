import { NextRequest, NextResponse } from 'next/server'
import { testApiToken } from '@/lib/vivo-api'
import { getFriendlyError, getErrorCode } from '@/lib/error-messages'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({
        valid: false,
        error: '请提供 API Token',
        errorCode: 'NO_TOKEN',
      }, { status: 400 })
    }

    const result = await testApiToken(token)

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        message: 'API Token 有效',
      })
    }

    return NextResponse.json({
      valid: false,
      error: result.error || 'Token 校验失败',
      errorCode: getErrorCode(result.error || ''),
    }, { status: 400 })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '校验失败'
    return NextResponse.json({
      valid: false,
      error: getFriendlyError(errorMsg),
      errorCode: getErrorCode(errorMsg),
    }, { status: 500 })
  }
}