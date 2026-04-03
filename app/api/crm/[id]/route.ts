import { NextResponse } from 'next/server';
import { getPageById, updateRecord, archiveRecord } from '@/lib/supabase/crm';
import type { CrmRecordUpdate } from '@/lib/supabase/crm-types';

/**
 * GET /api/crm/[id]
 * 단일 CRM 레코드 조회
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const record = await getPageById(params.id);
    return NextResponse.json(record);
  } catch (err) {
    console.error('CRM 조회 실패:', err);
    return NextResponse.json({ error: 'CRM 조회 실패' }, { status: 500 });
  }
}

/**
 * PATCH /api/crm/[id]
 * CRM 레코드 수정
 * Body: CrmRecordUpdate
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = (await request.json()) as CrmRecordUpdate;
    await updateRecord(params.id, body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CRM 수정 실패:', err);
    return NextResponse.json({ error: 'CRM 수정 실패' }, { status: 500 });
  }
}

/**
 * DELETE /api/crm/[id]
 * CRM 레코드 아카이브
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await archiveRecord(params.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CRM 아카이브 실패:', err);
    return NextResponse.json({ error: 'CRM 아카이브 실패' }, { status: 500 });
  }
}
