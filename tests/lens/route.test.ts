import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

const TEST_SECRET = 'test-lens-route-secret';
const TEST_COMPANY_ID = 'company-test-001';

// ── Supabase mock ──
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockOrder = vi.fn();

function chainMock() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return chain;
}

const estimateChain = chainMock();
const sheetChain = chainMock();
const itemChain = chainMock();

const mockFrom = vi.fn((table: string) => {
  if (table === 'estimates') return estimateChain;
  if (table === 'estimate_sheets') return sheetChain;
  if (table === 'estimate_items') return itemChain;
  return estimateChain;
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ from: mockFrom }),
}));

function makeHeaders(body: string): Headers {
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', TEST_SECRET)
    .update(timestamp + body)
    .digest('hex');
  return new Headers({
    'X-Lens-Signature': signature,
    'X-Lens-Timestamp': timestamp,
    'Content-Type': 'application/json',
  });
}

const sampleBody = JSON.stringify({
  quoteId: 'lens-q-100',
  customerId: 'cust-100',
  customerName: '테스트고객',
  customerPhone: '010-0000-0000',
  siteAddress: '서울시 테스트구',
  visitDate: '2026-05-01',
  salesPersonId: 'sp-100',
  salesPersonName: '테스트영업',
  areaM2: 150,
});

beforeEach(() => {
  vi.stubEnv('LENS_WEBHOOK_SECRET', TEST_SECRET);
  vi.stubEnv('LENS_DEFAULT_COMPANY_ID', TEST_COMPANY_ID);
  vi.resetModules();

  // Reset chain mocks
  Object.values(estimateChain).forEach((fn) => fn.mockReset?.());
  Object.values(sheetChain).forEach((fn) => fn.mockReset?.());

  // Default chaining
  estimateChain.select.mockReturnValue(estimateChain);
  estimateChain.insert.mockReturnValue(estimateChain);
  estimateChain.eq.mockReturnValue(estimateChain);
  estimateChain.limit.mockReturnValue(estimateChain);

  sheetChain.insert.mockResolvedValue({ error: null });
});

describe('POST /api/lens/quote', () => {
  it('정상 요청 → 201 + quoteId + editUrl', async () => {
    // idempotency check: 없음
    estimateChain.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      // insert 결과
      .mockResolvedValueOnce({ data: { id: 'est-new-001' }, error: null });

    const { POST } = await import('@/app/api/lens/quote/route');
    const req = new Request('http://localhost/api/lens/quote', {
      method: 'POST',
      body: sampleBody,
      headers: makeHeaders(sampleBody),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.quoteId).toBe('lens-q-100');
    expect(data.editUrl).toContain('lens-q-100');
    expect(data.status).toBe('draft');
  });

  it('HMAC 실패 → 401', async () => {
    const { POST } = await import('@/app/api/lens/quote/route');

    const badHeaders = new Headers({
      'X-Lens-Signature': 'invalid-signature-hex',
      'X-Lens-Timestamp': String(Date.now()),
    });

    const req = new Request('http://localhost/api/lens/quote', {
      method: 'POST',
      body: sampleBody,
      headers: badHeaders,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('필수 필드 누락 → 400', async () => {
    const incompleteBody = JSON.stringify({ quoteId: 'q-1' });
    const { POST } = await import('@/app/api/lens/quote/route');

    const req = new Request('http://localhost/api/lens/quote', {
      method: 'POST',
      body: incompleteBody,
      headers: makeHeaders(incompleteBody),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('필수 필드 누락');
  });

  it('idempotency: 같은 quoteId 2번 → 기존 반환 (200)', async () => {
    // 이미 존재
    estimateChain.single.mockResolvedValueOnce({
      data: { id: 'est-existing', external_quote_id: 'lens-q-100' },
      error: null,
    });

    const { POST } = await import('@/app/api/lens/quote/route');
    const req = new Request('http://localhost/api/lens/quote', {
      method: 'POST',
      body: sampleBody,
      headers: makeHeaders(sampleBody),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.quoteId).toBe('lens-q-100');
    expect(data.editUrl).toContain('lens-q-100');
  });
});

describe('GET /api/lens/quote/[quoteId]', () => {
  it('정상 요청 → 200 + QuoteOutput', async () => {
    // Estimate 조회
    estimateChain.single.mockResolvedValueOnce({
      data: {
        id: 'est-001',
        external_quote_id: 'lens-q-200',
        m2: 200,
        source: 'lens',
        input_mode: 'form',
        status: 'saved',
        date: '2026-04-10',
        wall_m2: 0,
      },
      error: null,
    });

    // Sheets
    sheetChain.select.mockReturnValue(sheetChain);
    sheetChain.eq.mockReturnValue(sheetChain);
    sheetChain.order.mockResolvedValueOnce({
      data: [
        { id: 'sh-1', type: '복합', grand_total: 5000000, sort_order: 0 },
        { id: 'sh-2', type: '우레탄', grand_total: 4000000, sort_order: 1 },
      ],
      error: null,
    });

    // Items (empty for both sheets)
    itemChain.select.mockReturnValue(itemChain);
    itemChain.eq.mockReturnValue(itemChain);
    itemChain.order
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const { GET } = await import(
      '@/app/api/lens/quote/[quoteId]/route'
    );

    const emptyBody = '';
    const headers = makeHeaders(emptyBody);
    const req = new Request(
      'http://localhost/api/lens/quote/lens-q-200',
      { method: 'GET', headers },
    );

    const res = await GET(req, { params: { quoteId: 'lens-q-200' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.quoteId).toBe('lens-q-200');
    expect(data.compositeTotalAmount).toBe(5000000);
    expect(data.urethaneTotalAmount).toBe(4000000);
  });
});
