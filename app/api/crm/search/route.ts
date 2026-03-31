// ── GET /api/crm/search?q=...&limit=... ──
// CRM 고객 이름 검색 (캘린더 이벤트 연결용)

import { NextRequest, NextResponse } from 'next/server';
import { notionFetch } from '@/lib/notion/client';

interface NotionPage {
  id: string;
  properties: Record<string, Record<string, unknown>>;
}

interface NotionQueryResult {
  results: NotionPage[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8', 10), 20);

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const dbId = process.env.NOTION_CRM_DB;
  if (!dbId) {
    return NextResponse.json({ error: 'NOTION_CRM_DB 환경변수가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const data = (await notionFetch(`/databases/${dbId}/query`, 'POST', {
      filter: {
        or: [
          {
            property: '고객명',
            rich_text: { contains: q },
          },
          {
            property: '주소',
            title: { contains: q },
          },
        ],
      },
      page_size: limit,
    })) as NotionQueryResult;

    const results = (data?.results ?? []).map((page) => {
      const p = page.properties;
      const customerName = (p['고객명'] as { rich_text?: Array<{ plain_text?: string }> } | undefined)
        ?.rich_text?.[0]?.plain_text ?? null;
      const address = (p['주소'] as { title?: Array<{ plain_text?: string }> } | undefined)
        ?.title?.[0]?.plain_text ?? '';
      const name = customerName || address;
      return { id: page.id, name };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[crm/search] 오류:', err);
    return NextResponse.json({ error: 'CRM 검색 실패' }, { status: 500 });
  }
}
