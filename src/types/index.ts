export interface VivoDocumentInfo {
  documentId: string
  documentName: string
  fileType: string
  fileSize: string
}

export interface VivoDocumentDetail {
  documentId: string
  fileCode: string
  baseFileName: string
  type: number
  fileSize: string
  downloadUrl: string
  innerDownloadUrl: string
}

export interface VivoApiResponse<T> {
  retcode: number
  message: string | null
  data: T
  success: boolean
}

export interface SheetData {
  sheetName: string
  fields: string[]
  data: Record<string, unknown>[]
  rowCount: number
}

export interface ReadDocumentResponse {
  success: boolean
  fileName?: string
  sheets?: SheetData[]
  sheetCount?: number
  nonEmptySheetCount?: number
  source?: string
  error?: string
  errorCode?: string
}

export interface ValidateTokenResponse {
  valid: boolean
  message?: string
  error?: string
  errorCode?: string
}

export interface ReadDocumentRequest {
  url: string
  apiToken: string
}