import { NextResponse } from 'next/server';
import { getAllRecords, createRecord } from '@/lib/supabase/crm';
import type { CrmRecordCreate } from '@/lib/supabase/crm-types';

/**
 * GET /api/crm
 * 전체 CRM 레코드 조회
 */
export async function GET() {
  try {
    const records = await getAllRecords();
    return NextResponse.json(records);
  } catch (err) {
    console.error('CRM 조회 실패:', err);
    return NextResponse.json({ error: 'CRM 조회 실패' }, { status: 500 });
  }
}

/**
 * POST /api/crm
 * 새 CRM 레코드 생성
 * Body: CrmRecordCreate (address 필수)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CrmRecordCreate;

    if (!body.address) {
      return NextResponse.json({ error: 'address 필드 필요' }, { status: 400 });
    }

    const record = await createRecord(body);
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    console.error('CRM 생성 실패:', err);
    return NextResponse.json({ error: 'CRM 생성 실패' }, { status: 500 });
  }
}
