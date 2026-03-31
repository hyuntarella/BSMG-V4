// ── Notion REST API Client ──
// Direct fetch wrapper (no SDK dependency)

const NOTION_VERSION = '2025-09-03';
const NOTION_BASE_URL = 'https://api.notion.com/v1';

/**
 * Notion REST API fetch helper
 * @param endpoint - API endpoint path (e.g., '/databases/{id}/query')
 * @param method - HTTP method
 * @param body - Request body (optional)
 */
export async function notionFetch(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  tokenOverride?: string,
  versionOverride?: string
): Promise<unknown> {
  const token = tokenOverride ?? process.env.NOTION_CRM_TOKEN;
  if (!token) {
    throw new Error('Notion API 토큰이 설정되지 않았습니다.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Notion-Version': versionOverride ?? NOTION_VERSION,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${NOTION_BASE_URL}${endpoint}`, options);

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion API 오류 [${res.status}]: ${errText}`);
  }

  return res.json();
}
