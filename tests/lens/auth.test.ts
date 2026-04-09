import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'crypto';

// LENS_WEBHOOK_SECRET 설정
const TEST_SECRET = 'test-lens-webhook-secret-key';

beforeEach(() => {
  vi.stubEnv('LENS_WEBHOOK_SECRET', TEST_SECRET);
});

function makeSignature(timestamp: string, body: string): string {
  return createHmac('sha256', TEST_SECRET)
    .update(timestamp + body)
    .digest('hex');
}

describe('Lens Auth — verifyLensSignature', () => {
  it('유효한 HMAC 서명 → true', async () => {
    const { verifyLensSignature } = await import('@/lib/lens/auth');

    const timestamp = String(Date.now());
    const body = '{"quoteId":"q-1"}';
    const signature = makeSignature(timestamp, body);

    expect(verifyLensSignature(signature, timestamp, body)).toBe(true);
  });

  it('잘못된 signature → false', async () => {
    const { verifyLensSignature } = await import('@/lib/lens/auth');

    const timestamp = String(Date.now());
    const body = '{"quoteId":"q-1"}';
    const badSig = createHmac('sha256', 'wrong-secret')
      .update(timestamp + body)
      .digest('hex');

    expect(verifyLensSignature(badSig, timestamp, body)).toBe(false);
  });
});

describe('Lens Auth — validateLensRequest', () => {
  it('만료된 timestamp (6분 전) → false + 에러 메시지', async () => {
    const { validateLensRequest } = await import('@/lib/lens/auth');

    const sixMinAgo = String(Date.now() - 6 * 60 * 1000);
    const body = '{"quoteId":"q-1"}';
    const signature = makeSignature(sixMinAgo, body);

    const headers = new Headers({
      'X-Lens-Signature': signature,
      'X-Lens-Timestamp': sixMinAgo,
    });

    const result = validateLensRequest(headers, body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('만료');
  });

  it('헤더 누락 → false + 에러 메시지', async () => {
    const { validateLensRequest } = await import('@/lib/lens/auth');

    const headers = new Headers();
    const result = validateLensRequest(headers, '{}');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('누락');
  });
});
