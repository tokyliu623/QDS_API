export const ERROR_MESSAGES: Record<string, string> = {
  NO_TOKEN: '请先配置 API Token',
  INVALID_TOKEN: 'API Token 无效，请在 vivo文档重新生成',
  TOKEN_NOT_SHARED: '请将 API Token 分享给"质量数据管理"系统',
  TOKEN_ILLEGAL: 'API Token 非法，请确认已在 vivo 文档平台分享给 qds',
  URL_INVALID: '链接无效或已过期',
  NO_PERMISSION: '您没有权限访问此文档',
  DOC_NOT_FOUND: '文档不存在或已被删除',
  NO_DOWNLOAD_URL: '无法获取文档下载链接',
  EMPTY_DOCUMENT: '文档为空',
  UNSUPPORTED_FORMAT: '仅支持 Excel、CSV、JSON 格式',
  FAILED_TO_READ: '读取文档失败',
  CONNECTION_FAILED: '连接测试失败，请检查网络或 API Token 是否正确',
}

export function getFriendlyError(errorMsg: string): string {
  for (const [pattern, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (errorMsg.includes(pattern)) {
      return friendly
    }
  }
  
  if (errorMsg.includes('retcode=1001')) {
    return ERROR_MESSAGES.URL_INVALID
  }
  if (errorMsg.includes('retcode=1002') || errorMsg.includes('retcode=400021')) {
    return ERROR_MESSAGES.NO_PERMISSION
  }
  if (errorMsg.includes('retcode=1003')) {
    return ERROR_MESSAGES.DOC_NOT_FOUND
  }
  if (errorMsg.includes('retcode=1004')) {
    return ERROR_MESSAGES.INVALID_TOKEN
  }
  if (errorMsg.includes('retcode=30026')) {
    return ERROR_MESSAGES.TOKEN_NOT_SHARED
  }
  if (errorMsg.includes('retcode=30100')) {
    return ERROR_MESSAGES.TOKEN_ILLEGAL
  }
  if (errorMsg.includes('Failed to read vivo document')) {
    const inner = errorMsg.replace('Failed to read vivo document: ', '')
    return `${ERROR_MESSAGES.FAILED_TO_READ}：${inner}`
  }
  if (errorMsg.includes('Not a vivo docs URL')) {
    return '链接格式不正确，请提供 docs.vivo.xyz 或 docs.vmic.xyz 的文档链接'
  }
  if (errorMsg.includes('Unsupported file format')) {
    return ERROR_MESSAGES.UNSUPPORTED_FORMAT
  }
  if (errorMsg.includes('No data found')) {
    return ERROR_MESSAGES.EMPTY_DOCUMENT
  }
  if (errorMsg.includes('无法获取文档下载链接')) {
    return ERROR_MESSAGES.NO_DOWNLOAD_URL
  }
  
  return errorMsg
}

export function getErrorCode(errorMsg: string): string {
  if (errorMsg.includes('NO_TOKEN')) return 'NO_TOKEN'
  if (errorMsg.includes('retcode=1004')) return 'INVALID_TOKEN'
  if (errorMsg.includes('retcode=30026')) return 'TOKEN_NOT_SHARED'
  if (errorMsg.includes('retcode=30100')) return 'TOKEN_ILLEGAL'
  if (errorMsg.includes('retcode=1001')) return 'URL_INVALID'
  if (errorMsg.includes('retcode=1002') || errorMsg.includes('retcode=400021')) return 'NO_PERMISSION'
  if (errorMsg.includes('retcode=1003')) return 'DOC_NOT_FOUND'
  if (errorMsg.includes('无法获取文档下载链接')) return 'NO_DOWNLOAD_URL'
  if (errorMsg.includes('No data found') || errorMsg.includes('文档为空')) return 'EMPTY_DOCUMENT'
  if (errorMsg.includes('Unsupported file format')) return 'UNSUPPORTED_FORMAT'
  return 'FAILED_TO_READ'
}