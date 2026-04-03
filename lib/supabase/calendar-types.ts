// ── Calendar Types (Notion → Supabase 이전) ──

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;        // ISO datetime or YYYY-MM-DD
  end: string | null;
  allDay: boolean;
  type: string;         // 방문, 시공, 미팅, 기타
  color: string;
  memberName: string | null;
  memberId: string | null;
  crmCustomerId: string | null;
  crmCustomerName: string | null;
  memo: string | null;
  action: string | null;
}

export interface CreateEventInput {
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  type?: string;
  memberId?: string;
  crmCustomerId?: string;
  memo?: string;
  action?: string;
}

export interface CalendarMember {
  id: string;
  name: string;
  color: string;
}
