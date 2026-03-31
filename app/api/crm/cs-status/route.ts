import { NextResponse } from 'next/server';
import { queryCrmByPipeline, updateCrmPipeline } from '@/lib/notion/crm';

/**
 * GET /api/crm/cs-status
 * 파이프라인 = '정보 입력 완료' 건 조회
 */
export async function GET() {
  try {
    const records = await queryCrmByPipeline('정보 입력 완료');
    return NextResponse.json(records);
  } catch (err) {
    console.error('CS 현황 조회 실패:', err);
    return NextResponse.json({ error: 'CS 현황 조회 실패' }, { status: 500 });
  }
}

/**
 * PATCH /api/crm/cs-status
 * Body: { pageId: string; pipeline: string }
 * 파이프라인 변경
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { pageId: string; pipeline: string };
    const { pageId, pipeline } = body;
    if (!pageId || !pipeline) {
      return NextResponse.json({ error: 'pageId, pipeline 필드가 필요합니다.' }, { status: 400 });
    }
    await updateCrmPipeline(pageId, pipeline);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('파이프라인 변경 실패:', err);
    return NextResponse.json({ error: '파이프라인 변경 실패' }, { status: 500 });
  }
}
