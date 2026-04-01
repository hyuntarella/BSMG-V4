import Header from '@/components/layout/Header';
import CrmPageClient from '@/components/crm/CrmPageClient';
import { getAllRecords } from '@/lib/notion/crm';
import type { CrmRecord } from '@/lib/notion/types';

export default async function CrmPage() {
  let records: CrmRecord[] = [];

  try {
    records = await getAllRecords();
  } catch {
    // Notion 환경변수 미설정 또는 API 오류 시 빈 배열로 폴백
    records = [];
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <CrmPageClient initialRecords={records} />
    </div>
  );
}
