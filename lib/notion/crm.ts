// ── Notion CRM CRUD functions ──

import { notionFetch } from './client';
import type {
  CrmRecord,
  CrmRecordCreate,
  CrmRecordUpdate,
  CrmComment,
  NotionPage,
} from './types';

// ── Type helpers ──

interface NotionQueryResult {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionCommentResult {
  results: Array<{
    id: string;
    created_time: string;
    created_by?: { id?: string; name?: string };
    rich_text: Array<{ plain_text: string }>;
  }>;
}

interface NotionCommentCreateResult {
  id: string;
  created_time: string;
  created_by?: { id?: string; name?: string };
  rich_text: Array<{ plain_text: string }>;
}

// ── Parsers ──

/**
 * Notion 페이지 프로퍼티를 CrmRecord로 변환
 */
export function parseNotionPage(page: NotionPage): CrmRecord {
  const p = page.properties;

  return {
    id: page.id,
    address: p.주소?.title?.[0]?.plain_text ?? '',
    customerName: p.고객명?.rich_text?.[0]?.plain_text ?? null,
    phone: p.전화번호?.phone_number ?? null,
    email: p.고객이메일?.email ?? null,
    manager: p.담당자?.select?.name ?? null,
    stage: p.단계?.select?.name ?? null,
    pipeline: p.파이프라인?.select?.name ?? null,
    contractStatus: p.계약상태?.select?.name ?? null,
    inquiryChannel: p.문의채널?.select?.name ?? null,
    workTypes: p.시공분야?.multi_select?.map((s) => s.name) ?? [],
    estimateAmount: p.견적금액?.number ?? null,
    contractAmount: p.계약금액?.number ?? null,
    deposit: p.착수금?.number ?? null,
    balance: p.잔금?.number ?? null,
    area: p.시공평수?.rich_text?.[0]?.plain_text ?? null,
    memo: p.메모?.rich_text?.[0]?.plain_text ?? null,
    inquiryDate: p.문의일자?.date?.start ?? null,
    visitDate: p.견적방문일자?.date?.start ?? null,
    balanceCompleteDate: p.잔금완료?.date?.start ?? null,
    estimateSentDate: p.견적서발송일?.date?.start ?? null,
    estimateViewedDate: p.견적서열람일?.date?.start ?? null,
    driveUrl: p.구글드라이브URL?.url ?? null,
    estimateWebUrl: p.견적서웹URL?.url ?? null,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
}

/**
 * CrmRecordUpdate를 Notion property 포맷으로 역변환
 */
export function buildNotionProperties(data: CrmRecordUpdate): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if (data.address !== undefined) {
    props['주소'] = { title: [{ text: { content: data.address } }] };
  }
  if (data.customerName !== undefined) {
    props['고객명'] = { rich_text: [{ text: { content: data.customerName ?? '' } }] };
  }
  if (data.phone !== undefined) {
    props['전화번호'] = { phone_number: data.phone };
  }
  if (data.email !== undefined) {
    props['고객이메일'] = { email: data.email };
  }
  if (data.manager !== undefined) {
    props['담당자'] = { select: data.manager ? { name: data.manager } : null };
  }
  if (data.stage !== undefined) {
    props['단계'] = { select: data.stage ? { name: data.stage } : null };
  }
  if (data.pipeline !== undefined) {
    props['파이프라인'] = { select: data.pipeline ? { name: data.pipeline } : null };
  }
  if (data.contractStatus !== undefined) {
    props['계약상태'] = { select: data.contractStatus ? { name: data.contractStatus } : null };
  }
  if (data.inquiryChannel !== undefined) {
    props['문의채널'] = { select: data.inquiryChannel ? { name: data.inquiryChannel } : null };
  }
  if (data.workTypes !== undefined) {
    props['시공분야'] = { multi_select: (data.workTypes ?? []).map((name) => ({ name })) };
  }
  if (data.estimateAmount !== undefined) {
    props['견적금액'] = { number: data.estimateAmount };
  }
  if (data.contractAmount !== undefined) {
    props['계약금액'] = { number: data.contractAmount };
  }
  if (data.deposit !== undefined) {
    props['착수금'] = { number: data.deposit };
  }
  if (data.balance !== undefined) {
    props['잔금'] = { number: data.balance };
  }
  if (data.area !== undefined) {
    props['시공평수'] = { rich_text: [{ text: { content: data.area ?? '' } }] };
  }
  if (data.memo !== undefined) {
    props['메모'] = { rich_text: [{ text: { content: data.memo ?? '' } }] };
  }
  if (data.inquiryDate !== undefined) {
    props['문의일자'] = data.inquiryDate ? { date: { start: data.inquiryDate } } : { date: null };
  }
  if (data.visitDate !== undefined) {
    props['견적방문일자'] = data.visitDate ? { date: { start: data.visitDate } } : { date: null };
  }
  if (data.balanceCompleteDate !== undefined) {
    props['잔금완료'] = data.balanceCompleteDate ? { date: { start: data.balanceCompleteDate } } : { date: null };
  }
  if (data.estimateSentDate !== undefined) {
    props['견적서발송일'] = data.estimateSentDate ? { date: { start: data.estimateSentDate } } : { date: null };
  }
  if (data.estimateViewedDate !== undefined) {
    props['견적서열람일'] = data.estimateViewedDate ? { date: { start: data.estimateViewedDate } } : { date: null };
  }
  if (data.driveUrl !== undefined) {
    props['구글드라이브URL'] = { url: data.driveUrl };
  }
  if (data.estimateWebUrl !== undefined) {
    props['견적서웹URL'] = { url: data.estimateWebUrl };
  }

  return props;
}

// ── CRUD functions ──

/**
 * 전체 CRM 레코드 조회 (페이지네이션 처리)
 */
export async function getAllRecords(): Promise<CrmRecord[]> {
  const dbId = process.env.NOTION_CRM_DB_ID;
  if (!dbId) {
    throw new Error('NOTION_CRM_DB_ID 환경변수가 설정되지 않았습니다.');
  }

  const records: CrmRecord[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const body: Record<string, unknown> = {
      filter: { property: 'archived', checkbox: { equals: false } },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    };
    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const result = (await notionFetch(
      `/databases/${dbId}/query`,
      'POST',
      body
    )) as NotionQueryResult;

    for (const page of result.results) {
      if (!page.archived) {
        records.push(parseNotionPage(page));
      }
    }

    hasMore = result.has_more;
    startCursor = result.next_cursor ?? undefined;
  }

  return records;
}

/**
 * 단일 페이지 조회
 */
export async function getPageById(id: string): Promise<CrmRecord> {
  const page = (await notionFetch(`/pages/${id}`, 'GET')) as NotionPage;
  return parseNotionPage(page);
}

/**
 * 레코드 수정
 */
export async function updateRecord(id: string, data: CrmRecordUpdate): Promise<void> {
  const properties = buildNotionProperties(data);
  await notionFetch(`/pages/${id}`, 'PATCH', { properties });
}

/**
 * 새 레코드 생성
 */
export async function createRecord(data: CrmRecordCreate): Promise<CrmRecord> {
  const dbId = process.env.NOTION_CRM_DB_ID;
  if (!dbId) {
    throw new Error('NOTION_CRM_DB_ID 환경변수가 설정되지 않았습니다.');
  }

  const properties = buildNotionProperties(data);
  const page = (await notionFetch(`/pages`, 'POST', {
    parent: { database_id: dbId },
    properties,
  })) as NotionPage;

  return parseNotionPage(page);
}

/**
 * 레코드 아카이브 (삭제)
 */
export async function archiveRecord(id: string): Promise<void> {
  await notionFetch(`/pages/${id}`, 'PATCH', { archived: true });
}

/**
 * 페이지 댓글 조회
 */
export async function getPageComments(id: string): Promise<CrmComment[]> {
  const result = (await notionFetch(
    `/comments?block_id=${id}`,
    'GET'
  )) as NotionCommentResult;

  return result.results.map((c) => ({
    id: c.id,
    content: c.rich_text?.[0]?.plain_text ?? '',
    createdTime: c.created_time,
    createdBy: c.created_by?.name ?? null,
  }));
}

/**
 * 댓글 추가
 */
export async function addComment(pageId: string, content: string): Promise<CrmComment> {
  const result = (await notionFetch(`/comments`, 'POST', {
    parent: { page_id: pageId },
    rich_text: [{ text: { content } }],
  })) as NotionCommentCreateResult;

  return {
    id: result.id,
    content: result.rich_text?.[0]?.plain_text ?? content,
    createdTime: result.created_time,
    createdBy: result.created_by?.name ?? null,
  };
}
