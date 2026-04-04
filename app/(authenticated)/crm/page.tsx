import Header from '@/components/layout/Header';
import InquiryKanban from '@/components/inquiry/InquiryKanban';
import { getAllInquiries } from '@/lib/supabase/inquiry';
import type { Inquiry } from '@/lib/supabase/inquiry-types';

export default async function CrmPage() {
  let inquiries: Inquiry[] = [];

  try {
    inquiries = await getAllInquiries();
  } catch {
    // DB 오류 시 빈 배열로 폴백
    inquiries = [];
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />
      <InquiryKanban initialInquiries={inquiries} />
    </div>
  );
}
