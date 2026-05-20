import { NextRequest, NextResponse } from 'next/server'
import {
  isVivoDocsUrl,
  getDocumentDownloadUrl,
  downloadFile,
} from '@/lib/vivo-api'
import { getCache, setCache } from '@/lib/file-cache'
import { getFriendlyError, getErrorCode } from '@/lib/error-messages'

const UNSUPPORTED_FORMATS = ['.docx', '.doc', '.pdf', '.txt']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, apiToken, raw } = body

    if (!url) {
      return NextResponse.json({
        success: false,
        error: '请提供文档链接',
        errorCode: 'NO_URL',
      }, { status: 400 })
    }

    if (!apiToken) {
      return NextResponse.json({
        success: false,
        error: '请先配置 API Token',
        errorCode: 'NO_TOKEN',
      }, { status: 400 })
    }

    if (!isVivoDocsUrl(url)) {
      return NextResponse.json({
        success: false,
        error: '链接格式不正确，请提供 docs.vivo.xyz 或 docs.vmic.xyz 的文档链接',
        errorCode: 'INVALID_URL',
      }, { status: 400 })
    }

    const docDetail = await getDocumentDownloadUrl(url, apiToken)
    const downloadUrl = docDetail.downloadUrl || docDetail.innerDownloadUrl

    if (!downloadUrl) {
      return NextResponse.json({
        success: false,
        error: getFriendlyError('无法获取文档下载链接'),
        errorCode: 'NO_DOWNLOAD_URL',
      }, { status: 400 })
    }

    const fileContent = await downloadFile(downloadUrl)
    const fileName = docDetail.baseFileName.toLowerCase()

    for (const unsupported of UNSUPPORTED_FORMATS) {
      if (fileName.endsWith(unsupported)) {
        return NextResponse.json({
          success: false,
          error: getFriendlyError(`Unsupported file format: ${unsupported}`),
          errorCode: 'UNSUPPORTED_FORMAT',
          fileName: docDetail.baseFileName,
        }, { status: 400 })
      }
    }

    const fileType = fileName.split('.').pop() || ''
    if (!['xlsx', 'xls', 'csv', 'json'].includes(fileType)) {
      return NextResponse.json({
        success: false,
        error: getFriendlyError(`Unsupported file format: .${fileType}`),
        errorCode: 'UNSUPPORTED_FORMAT',
      }, { status: 400 })
    }

    if (raw === true) {
      return NextResponse.json({
        success: true,
        fileName: docDetail.baseFileName,
        fileType,
        data: fileContent.toString('base64'),
        source: 'vivo_doc',
      })
    }

    const cached = await getCache(url)
    if (cached.found && cached.data) {
      return NextResponse.json({
        success: true,
        fileName: cached.fileName,
        sheets: cached.data,
        sheetCount: cached.sheetCount,
        nonEmptySheetCount: cached.nonEmptySheetCount,
        source: 'vivo_doc',
        cached: true,
      })
    }

    return NextResponse.json({
      success: false,
      error: '请使用 raw=true 参数获取原始文件，由客户端解析',
      errorCode: 'USE_RAW_MODE',
    }, { status: 400 })

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '读取文档失败'
    console.error('[vivo-docs/read] Error:', errorMsg)
    
    return NextResponse.json({
      success: false,
      error: getFriendlyError(`Failed to read vivo document: ${errorMsg}`),
      errorCode: getErrorCode(errorMsg),
    }, { status: 500 })
  }
}