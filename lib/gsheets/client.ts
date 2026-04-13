/**
 * Google Sheets / Drive 클라이언트 — Phase 5
 *
 * lib/gdrive/client.ts 의 getAuth() 를 재사용 (drive + spreadsheets scope 포함).
 */
import { google } from 'googleapis'
import { getAuth } from '@/lib/gdrive/client'
import type { Method } from '@/lib/estimate/types'

export function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuth() })
}

export function getTemplateId(method: Method): string {
  const key = method === '복합' ? 'GOOGLE_SHEETS_TEMPLATE_COMPLEX_ID' : 'GOOGLE_SHEETS_TEMPLATE_URETHANE_ID'
  const id = process.env[key]?.trim()
  if (!id) throw new Error(`${key} 환경변수 필요`)
  return id
}
