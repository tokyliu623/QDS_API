import * as crypto from 'crypto'
import { spawn } from 'child_process'
import * as path from 'path'
import type { VivoDocumentDetail, VivoApiResponse, SheetData } from '@/types'

// Load environment variables
import { config } from 'dotenv'
config()

const VIVO_AK = process.env.VIVO_AK || ''
const VIVO_SK = process.env.VIVO_SK || ''
const VIVO_BASE_URL = process.env.VIVO_BASE_URL || 'https://docs.vivo.xyz'
const VIVO_GROUP_ID = 'qds'

export function isVivoDocsUrl(url: string): boolean {
  return url.includes('docs.vivo.xyz') || url.includes('docs.vmic.xyz')
}

export function extractDocLink(url: string): string {
  if (url.includes('docs.vivo.xyz')) {
    return url
  }
  if (url.includes('docs.vmic.xyz')) {
    return url.replace('docs.vmic.xyz', 'docs.vivo.xyz')
  }
  return url
}

function padPkcs5(data: Buffer): Buffer {
  const blockSize = 16
  const paddingLen = blockSize - (data.length % blockSize)
  return Buffer.concat([data, Buffer.alloc(paddingLen, paddingLen)])
}

function aesEncrypt(ak: string, sk: string, data: string): string {
  const iv = Buffer.from(ak, 'utf-8')
  const key = Buffer.from(sk, 'utf-8')
  
  const dataBytes = Buffer.from(data, 'utf-8')
  const paddedData = padPkcs5(dataBytes)
  
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv)
  cipher.setAutoPadding(false)
  let encrypted = cipher.update(paddedData)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  return encrypted.toString('base64')
}

function buildSecret(data: object): string {
  const jsonStr = JSON.stringify(data)
  return aesEncrypt(VIVO_AK, VIVO_SK, jsonStr)
}

async function callVivoApi<T>(endpoint: string, payload: object): Promise<T> {
  const secret = buildSecret(payload)
  
  const response = await fetch(`${VIVO_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'v-app-id': VIVO_GROUP_ID,
    },
    body: JSON.stringify({
      groupId: VIVO_GROUP_ID,
      secret,
    }),
  })

  const result: VivoApiResponse<T> = await response.json()
  
  if (!result.success || result.retcode !== 0) {
    const msg = result.message || 'Unknown error'
    throw new Error(`vivo API error: retcode=${result.retcode}, ${msg}`)
  }

  return result.data
}

export async function getDocumentDownloadUrl(
  link: string,
  apiToken: string
): Promise<VivoDocumentDetail> {
  const normalizedLink = extractDocLink(link)
  return callVivoApi<VivoDocumentDetail>('/api/v2/open/link/document/detail.do', {
    apiToken,
    link: normalizedLink,
  })
}

export async function testApiToken(apiToken: string): Promise<{ valid: boolean; error?: string }> {
  const testLink = 'https://docs.vivo.xyz/detail/office/000000000000'
  
  try {
    await getDocumentDownloadUrl(testLink, apiToken)
    return { valid: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    
    if (msg.includes('retcode=1003') || msg.includes('retcode=400021')) {
      return { valid: true }
    }
    if (msg.includes('retcode=30026')) {
      return { valid: false, error: '请将 API Token 分享给"质量数据管理"系统' }
    }
    if (msg.includes('retcode=1004')) {
      return { valid: false, error: 'API Token 无效，请在 vivo文档重新生成' }
    }
    if (msg.includes('retcode=30100')) {
      return { valid: false, error: 'API Token 非法，请确认已在 vivo 文档平台分享给 qds' }
    }
    
    return { valid: false, error: `连接测试失败：${msg}` }
  }
}

export async function downloadFile(downloadUrl: string): Promise<Buffer> {
  const response = await fetch(downloadUrl)
  if (!response.ok) {
    throw new Error(`下载文件失败: ${response.status}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function parseExcelAllSheets(content: Buffer): Promise<SheetData[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'parse_excel.py')
    const python = spawn('python3', [scriptPath])

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => { stdout += data.toString() })
    python.stderr.on('data', (data) => { stderr += data.toString() })

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`))
        return
      }
      try {
        const sheets = JSON.parse(stdout) as SheetData[]
        resolve(sheets)
      } catch (e) {
        reject(new Error(`Failed to parse Python output: ${e}`))
      }
    })

    python.on('error', (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`))
    })

    python.stdin.write(content)
    python.stdin.end()
  })
}

export function parseCsv(content: Buffer): SheetData {
  const text = content.toString('utf-8')
  const lines = text.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    return { sheetName: 'Sheet1', fields: [], data: [], rowCount: 0 }
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const data: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, unknown> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })
    data.push(row)
  }

  return {
    sheetName: 'Sheet1',
    fields: headers,
    data,
    rowCount: data.length,
  }
}

export function parseJson(content: Buffer): SheetData {
  const jsonData = JSON.parse(content.toString('utf-8'))
  const data = Array.isArray(jsonData) ? jsonData : [jsonData]
  
  if (data.length === 0) {
    return { sheetName: 'Sheet1', fields: [], data: [], rowCount: 0 }
  }

  const fields = Object.keys(data[0])

  return {
    sheetName: 'Sheet1',
    fields,
    data,
    rowCount: data.length,
  }
}